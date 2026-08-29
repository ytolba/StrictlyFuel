import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const foodSelect = "id,source_id,source_product_id,barcode,name,brand,category,image_url,carb_speed_tier_id,carb_speed_reason,calories_per_100g,carbs_per_100g,protein_per_100g,fat_per_100g,fiber_per_100g,sugar_per_100g,sodium_mg_per_100g,data_quality_score,is_verified";

type NormalizedFood = {
  source_id: "usda" | "open_food_facts";
  source_product_id: string;
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  image_url?: string;
  calories_per_100g: number;
  carbs_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sugar_per_100g?: number;
  sodium_mg_per_100g?: number;
  raw_source_data: unknown;
};

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeQuery = (value: unknown) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);

function classify(food: NormalizedFood) {
  const text = `${food.name} ${food.brand || ""} ${food.category || ""}`.toLowerCase();
  if (/gel|sports drink|electrolyte|honey|maple syrup|juice|rice cake|white bread/.test(text)) {
    return { tier: "fast", confidence: 82, reason: "Lower-fiber or liquid/concentrated carbohydrate source." };
  }
  if (/oat|whole grain|brown rice|quinoa|bran|legume|bean|sweet potato|peanut|nut butter/.test(text) || food.fiber_per_100g >= 5 || food.fat_per_100g >= 12) {
    return { tier: "slow", confidence: 78, reason: "Higher fiber, fat, or intact food structure may increase digestion time." };
  }
  return { tier: "medium", confidence: 62, reason: "Moderate practical digestion estimate pending product-specific review." };
}

const usdaNutrient = (food: any, id: number) => number(food.foodNutrients?.find((item: any) => item.nutrientId === id)?.value);

async function searchUsda(query: string, apiKey: string): Promise<NormalizedFood[]> {
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, pageSize: 18, dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`USDA search returned ${response.status}`);
  const payload = await response.json();
  return (payload.foods || []).map((food: any) => ({
    source_id: "usda",
    source_product_id: String(food.fdcId),
    name: String(food.description || "Unnamed food"),
    brand: food.brandOwner || food.brandName || undefined,
    category: food.foodCategory || undefined,
    calories_per_100g: usdaNutrient(food, 1008),
    carbs_per_100g: usdaNutrient(food, 1005),
    protein_per_100g: usdaNutrient(food, 1003),
    fat_per_100g: usdaNutrient(food, 1004),
    fiber_per_100g: usdaNutrient(food, 1079),
    sugar_per_100g: usdaNutrient(food, 2000),
    sodium_mg_per_100g: usdaNutrient(food, 1093),
    raw_source_data: food,
  }));
}

async function searchOpenFoodFacts(query: string): Promise<NormalizedFood[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "18");
  url.searchParams.set("fields", "code,product_name,brands,categories,image_front_small_url,nutriments");
  const response = await fetch(url, {
    headers: { "User-Agent": "StrictlyFuel/1.0 (food-catalog@strictlyinc.com)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Open Food Facts returned ${response.status}`);
  const payload = await response.json();
  return (payload.products || []).filter((food: any) => food.code && food.product_name).map((food: any) => ({
    source_id: "open_food_facts",
    source_product_id: String(food.code),
    barcode: String(food.code),
    name: String(food.product_name),
    brand: food.brands || undefined,
    category: food.categories?.split(",")[0] || undefined,
    image_url: food.image_front_small_url || undefined,
    calories_per_100g: number(food.nutriments?.["energy-kcal_100g"]),
    carbs_per_100g: number(food.nutriments?.carbohydrates_100g),
    protein_per_100g: number(food.nutriments?.proteins_100g),
    fat_per_100g: number(food.nutriments?.fat_100g),
    fiber_per_100g: number(food.nutriments?.fiber_100g),
    sugar_per_100g: number(food.nutriments?.sugars_100g),
    sodium_mg_per_100g: number(food.nutriments?.sodium_100g) * 1000,
    raw_source_data: food,
  }));
}

async function lookupOpenFoodFactsBarcode(barcode: string): Promise<NormalizedFood[]> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,categories,image_front_small_url,nutriments`, {
    headers: { "User-Agent": "StrictlyFuel/1.0 (food-catalog@strictlyinc.com)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const food = payload.product;
  if (!food?.code || !food?.product_name) return [];
  return [{
    source_id: "open_food_facts", source_product_id: String(food.code), barcode: String(food.code),
    name: String(food.product_name), brand: food.brands || undefined, category: food.categories?.split(",")[0] || undefined,
    image_url: food.image_front_small_url || undefined, calories_per_100g: number(food.nutriments?.["energy-kcal_100g"]),
    carbs_per_100g: number(food.nutriments?.carbohydrates_100g), protein_per_100g: number(food.nutriments?.proteins_100g),
    fat_per_100g: number(food.nutriments?.fat_100g), fiber_per_100g: number(food.nutriments?.fiber_100g),
    sugar_per_100g: number(food.nutriments?.sugars_100g), sodium_mg_per_100g: number(food.nutriments?.sodium_100g) * 1000,
    raw_source_data: food,
  }];
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();
  try {
    const { query, barcode, limit = 25 } = await request.json();
    const normalizedBarcode = String(barcode || "").replace(/\D/g, "").slice(0, 18);
    const normalizedQuery = normalizeQuery(query);
    const secretDictionary = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Object.values(secretDictionary)[0];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl || !secretKey) throw new Error("Supabase server credentials are unavailable.");
    const admin = createClient(supabaseUrl, String(secretKey), { auth: { persistSession: false } });
    if (normalizedBarcode.length >= 8) {
      const { data: saved } = await admin.from("foods").select(foodSelect).eq("barcode", normalizedBarcode).limit(1);
      if (saved?.length) return Response.json({ foods: saved, source: "catalog", cached: true }, { headers: corsHeaders });
      const external = await lookupOpenFoodFactsBarcode(normalizedBarcode);
      if (!external.length) return Response.json({ foods: [], source: "open_food_facts", cached: false }, { headers: corsHeaders });
      const rows = external.map((food) => {
        const classification = classify(food);
        return { ...food, carb_speed_tier_id: classification.tier, carb_speed_confidence: classification.confidence, carb_speed_reason: classification.reason, data_quality_score: 68, is_verified: false };
      });
      const { data: stored, error: storeError } = await admin.from("foods").upsert(rows, { onConflict: "source_id,source_product_id" }).select(foodSelect);
      if (storeError) throw storeError;
      return Response.json({ foods: stored || [], source: "open_food_facts", cached: false }, { headers: corsHeaders });
    }
    if (normalizedQuery.length < 2) return Response.json({ error: "Enter at least two characters." }, { status: 400, headers: corsHeaders });

    const { data: local, error: localError } = await admin.rpc("search_food_catalog", { search_text: normalizedQuery, result_limit: Math.min(number(limit) || 25, 50) });
    if (localError) throw localError;
    if ((local || []).length >= 8) {
      await admin.from("food_api_events").insert({ normalized_query: normalizedQuery, provider: "strictly", result_count: local.length, cache_hit: true, latency_ms: Date.now() - startedAt });
      return Response.json({ foods: local, source: "catalog", cached: true }, { headers: { ...corsHeaders, "Cache-Control": "public, max-age=120" } });
    }

    const { data: cached } = await admin.from("food_search_cache").select("result_food_ids,provider,expires_at,hit_count").eq("query_key", normalizedQuery).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (cached?.result_food_ids?.length) {
      const { data: cachedFoods } = await admin.from("foods").select(foodSelect).in("id", cached.result_food_ids).limit(Math.min(number(limit) || 25, 50));
      await admin.from("food_search_cache").update({ hit_count: (cached.hit_count || 0) + 1 }).eq("query_key", normalizedQuery);
      await admin.from("food_api_events").insert({ normalized_query: normalizedQuery, provider: cached.provider, result_count: cachedFoods?.length || 0, cache_hit: true, latency_ms: Date.now() - startedAt });
      return Response.json({ foods: cachedFoods || local || [], source: cached.provider, cached: true }, { headers: { ...corsHeaders, "Cache-Control": "public, max-age=120" } });
    }

    const usdaKey = Deno.env.get("USDA_FDC_API_KEY");
    const searches = [searchOpenFoodFacts(normalizedQuery)];
    if (usdaKey) searches.push(searchUsda(normalizedQuery, usdaKey));
    const settled = await Promise.allSettled(searches);
    const external = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);

    const rows = external.map((food) => {
      const classification = classify(food);
      return {
        ...food,
        carb_speed_tier_id: classification.tier,
        carb_speed_confidence: classification.confidence,
        carb_speed_reason: classification.reason,
        data_quality_score: food.source_id === "usda" ? 88 : 62,
        is_verified: food.source_id === "usda",
      };
    }).filter((food) => food.carbs_per_100g <= 100 && food.protein_per_100g <= 100 && food.fat_per_100g <= 100);

    if (rows.length) {
      const { error: upsertError } = await admin.from("foods").upsert(rows, { onConflict: "source_id,source_product_id" });
      if (upsertError) console.error("Food cache upsert failed", upsertError.message);
    }

    const { data: combined, error: combinedError } = await admin.rpc("search_food_catalog", { search_text: normalizedQuery, result_limit: Math.min(number(limit) || 25, 50) });
    if (combinedError) throw combinedError;
    const provider = usdaKey ? "usda" : "open_food_facts";
    await admin.from("food_search_cache").upsert({
      query_key: normalizedQuery,
      query_text: normalizedQuery,
      provider,
      result_food_ids: (combined || []).map((food: any) => food.id),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await admin.from("food_api_events").insert({ normalized_query: normalizedQuery, provider, result_count: combined?.length || 0, cache_hit: false, latency_ms: Date.now() - startedAt });
    return Response.json({ foods: combined || local || [], source: usdaKey ? "usda+open_food_facts" : "open_food_facts", cached: false }, { headers: { ...corsHeaders, "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Food search failed." }, { status: 500, headers: corsHeaders });
  }
});
