import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const foodSelect = "id,source_id,source_product_id,barcode,name,brand,description,category,image_url,carb_speed_tier_id,carb_speed_confidence,carb_speed_reason,calories_per_100g,carbs_per_100g,protein_per_100g,fat_per_100g,fiber_per_100g,soluble_fiber_per_100g,insoluble_fiber_per_100g,sugar_alcohols_per_100g,sugar_alcohol_type,allulose_per_100g,alcohol_per_100g,sugar_per_100g,sodium_mg_per_100g,data_quality_score,is_verified";

type NormalizedFood = {
  source_id: "usda" | "open_food_facts";
  source_product_id: string;
  barcode?: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  image_url?: string;
  calories_per_100g: number;
  carbs_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sugar_alcohols_per_100g?: number;
  sugar_alcohol_type?: "unknown";
  allulose_per_100g?: number;
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
  const carbs = number(food.carbs_per_100g);
  const fiber = Math.min(carbs, number(food.fiber_per_100g));
  const fat = number(food.fat_per_100g);
  const protein = number(food.protein_per_100g);
  const sugar = Math.min(carbs, number(food.sugar_per_100g));
  const name = String(food.name || "").toLowerCase();
  if (carbs < 1) return { tier: "unknown", confidence: 100, reason: "No meaningful carbohydrate to classify." };
  if (/\b(candy|gumm(?:y|ies)|sour belts?|candy belts?|fruit chews?|licorice|jelly beans?|hard candy|marshmallows?|energy gels?|sports drinks?|honey|maple syrup|corn syrup|glucose syrup|dextrose|maltodextrin|juice|soda|soft drink|jam|jelly)\b/.test(name)) {
    if (/\b(chocolate|cookie|biscuit|cake|pastry|donut|ice cream)\b/.test(name) || fat >= 12) {
      return { tier: "medium", confidence: 86, reason: "Concentrated sugar is mixed with substantial fat or a heavier dessert structure." };
    }
    return { tier: "fast", confidence: 95, reason: "Concentrated sugar or sports fuel with little intact food structure." };
  }
  if (/\b(chocolate|cookie|biscuit|cake|pastry|donut|ice cream)\b/.test(name)) return { tier: "medium", confidence: 84, reason: "Sugar is combined with fat, protein, or a mixed baked-food structure." };
  if (/\b(oats?|oatmeal|whole grain|whole wheat|brown rice|quinoa|barley|bran|beans?|lentils?|legumes?|chickpeas?|sweet potato|nuts?|nut butter|peanut butter)\b/.test(name)) return { tier: "slow", confidence: 88, reason: "Intact structure, fiber, or fat generally makes this a slower practical carb source." };
  if (/\b(white rice|white bread|bagels?|rice cakes?|pretzels?|cream of rice|corn flakes?|rice cereal|pasta|noodles?)\b/.test(name)) return { tier: "medium", confidence: 86, reason: "Refined starch with moderate practical availability in a normal serving." };
  if (/\b(banana|apples?|oranges?|berries|grapes?|mango|pineapple|fruit)\b/.test(name)) return { tier: "medium", confidence: 82, reason: "Whole-fruit structure makes availability more gradual than juice or candy." };
  if (sugar > 0) {
    const digestible = Math.max(1, carbs - fiber - number(food.sugar_alcohols_per_100g) - number(food.allulose_per_100g));
    const sugarShare = sugar / digestible;
    if (sugarShare >= 0.65 && fiber < 3) {
      return fat >= 10 || protein >= 10
        ? { tier: "medium", confidence: 82, reason: "Mostly sugar, with fat or protein slowing the mixed food." }
        : { tier: "fast", confidence: 90, reason: "Most digestible carbohydrate is sugar and the food is low in fiber and fat." };
    }
    if (fiber >= 6) return { tier: "slow", confidence: 78, reason: "High-fiber profile without dominant sugar." };
    if (fat >= 10 || protein >= 12 || fiber >= 3) return { tier: "medium", confidence: 74, reason: "Mixed nutrient profile suggests a middle-speed practical estimate." };
    return { tier: "medium", confidence: 68, reason: "Printed sugar and macros support a middle-speed estimate." };
  }
  return { tier: "unknown", confidence: 0, reason: "Not enough product-specific evidence to classify carb speed without guessing." };
}

const usdaNutrient = (food: any, id: number) => number(food.foodNutrients?.find((item: any) => item.nutrientId === id)?.value);

function normalizeUsdaFood(food: any): NormalizedFood {
  const barcode = String(food.gtinUpc || "").replace(/\D/g, "") || undefined;
  return {
    source_id: "usda",
    source_product_id: String(food.fdcId),
    barcode,
    name: String(food.description || "Unnamed food"),
    brand: food.brandOwner || food.brandName || undefined,
    description: food.ingredients || undefined,
    category: food.foodCategory || undefined,
    calories_per_100g: usdaNutrient(food, 1008),
    carbs_per_100g: usdaNutrient(food, 1005),
    protein_per_100g: usdaNutrient(food, 1003),
    fat_per_100g: usdaNutrient(food, 1004),
    fiber_per_100g: usdaNutrient(food, 1079),
    sugar_per_100g: usdaNutrient(food, 2000),
    sodium_mg_per_100g: usdaNutrient(food, 1093),
    raw_source_data: food,
  };
}

async function searchUsda(query: string, apiKey: string): Promise<NormalizedFood[]> {
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, pageSize: 18, dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`USDA search returned ${response.status}`);
  const payload = await response.json();
  return (payload.foods || []).map(normalizeUsdaFood);
}

async function lookupUsdaBarcode(candidates: string[], apiKey: string): Promise<NormalizedFood[]> {
  // FoodData Central search can contain historical versions of one branded
  // product. Request recent records first, then accept only exact GTIN/UPC
  // variants so a numeric description cannot produce a false match.
  for (const candidate of candidates) {
    const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: candidate,
        pageSize: 40,
        dataType: ["Branded"],
        sortBy: "publishedDate",
        sortOrder: "desc",
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) continue;
    const payload = await response.json();
    const matched = (payload.foods || []).find((food: any) => {
      const code = String(food.gtinUpc || "").replace(/\D/g, "");
      return barcodeCandidates(code).some((value) => candidates.includes(value));
    });
    if (matched) return [normalizeUsdaFood(matched)];
  }
  return [];
}

async function searchOpenFoodFacts(query: string): Promise<NormalizedFood[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "18");
  url.searchParams.set("fields", "code,product_name,brands,categories,ingredients_text,image_front_small_url,serving_size,serving_quantity,nutriments");
  const response = await fetch(url, {
    headers: { "User-Agent": "StrictlyFuel/1.0 (getstrictly@gmail.com)" },
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
    description: food.ingredients_text || undefined,
    category: food.categories?.split(",")[0] || undefined,
    image_url: food.image_front_small_url || undefined,
    calories_per_100g: number(food.nutriments?.["energy-kcal_100g"]),
    carbs_per_100g: number(food.nutriments?.carbohydrates_100g),
    protein_per_100g: number(food.nutriments?.proteins_100g),
    fat_per_100g: number(food.nutriments?.fat_100g),
    fiber_per_100g: number(food.nutriments?.fiber_100g),
    sugar_alcohols_per_100g: number(food.nutriments?.polyols_100g),
    sugar_alcohol_type: number(food.nutriments?.polyols_100g) > 0 ? "unknown" : undefined,
    allulose_per_100g: number(food.nutriments?.allulose_100g),
    sugar_per_100g: number(food.nutriments?.sugars_100g),
    sodium_mg_per_100g: number(food.nutriments?.sodium_100g) * 1000,
    raw_source_data: food,
  }));
}

async function lookupOpenFoodFactsBarcode(barcode: string): Promise<NormalizedFood[]> {
  const hosts = ["world.openfoodfacts.org", "us.openfoodfacts.org", "openfoodfacts.org"];
  for (const host of hosts) {
    try {
      const response = await fetch(`https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,categories,ingredients_text,image_front_small_url,serving_size,serving_quantity,nutriments`, {
        headers: { "User-Agent": "StrictlyFuel/1.0 (getstrictly@gmail.com)" }, signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const food = payload.product;
      if (!food?.code || !food?.product_name) continue;
      return [{
    source_id: "open_food_facts", source_product_id: String(food.code), barcode: String(food.code),
    name: String(food.product_name), brand: food.brands || undefined, description: food.ingredients_text || undefined, category: food.categories?.split(",")[0] || undefined,
    image_url: food.image_front_small_url || undefined, calories_per_100g: number(food.nutriments?.["energy-kcal_100g"]),
    carbs_per_100g: number(food.nutriments?.carbohydrates_100g), protein_per_100g: number(food.nutriments?.proteins_100g),
    fat_per_100g: number(food.nutriments?.fat_100g), fiber_per_100g: number(food.nutriments?.fiber_100g),
    sugar_alcohols_per_100g: number(food.nutriments?.polyols_100g), sugar_alcohol_type: number(food.nutriments?.polyols_100g) > 0 ? "unknown" : undefined,
    allulose_per_100g: number(food.nutriments?.allulose_100g),
    sugar_per_100g: number(food.nutriments?.sugars_100g), sodium_mg_per_100g: number(food.nutriments?.sodium_100g) * 1000,
    raw_source_data: food,
      }];
    } catch { /* try the next regional mirror */ }
  }
  return [];
}

function expandUpce(value: string) {
  if (!/^\d{8}$/.test(value)) return null;
  const [numberSystem, d1, d2, d3, d4, d5, d6, check] = value;
  if (d6 === "0" || d6 === "1" || d6 === "2") return `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}${check}`;
  if (d6 === "3") return `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}${check}`;
  if (d6 === "4") return `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}${check}`;
  return `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}${check}`;
}

function barcodeCandidates(value: string) {
  const normalized = value.replace(/\D/g, "").slice(0, 18);
  const values = new Set<string>([normalized]);
  // UPC-A is often represented as an EAN-13 with a leading zero, and some
  // camera scanners return the opposite form. Query both before going online.
  if (normalized.length === 12) values.add(`0${normalized}`);
  if (normalized.length === 13 && normalized.startsWith("0")) values.add(normalized.slice(1));
  const expanded = expandUpce(normalized);
  if (expanded) {
    values.add(expanded);
    values.add(`0${expanded}`);
  }
  return [...values].filter((candidate) => candidate.length >= 8);
}

async function cacheBarcodeAliases(admin: any, candidates: string[], foodId: string, source: string) {
  await admin.from("food_barcode_aliases").upsert(
    candidates.map((barcode) => ({ barcode, food_id: foodId, source })),
    { onConflict: "barcode" },
  );
}

async function recordBarcodeMiss(admin: any, barcode: string) {
  // This RPC is added by the matching migration. Keep misses non-fatal so an
  // app deployed moments before its migration still returns a clean no-match.
  const { error } = await admin.rpc("record_food_barcode_miss", { p_barcode: barcode });
  if (error && !/does not exist/i.test(error.message)) console.error("barcode miss tracking failed", error.message);
}

function defaultPortion(food: NormalizedFood) {
  const raw = food.raw_source_data as any;
  if (food.source_id === "open_food_facts") {
    const grams = number(raw?.serving_quantity);
    if (grams > 0 && grams <= 2500) return { grams, label: String(raw?.serving_size || `${grams} g`) };
  }
  const amount = number(raw?.servingSize);
  const unit = String(raw?.servingSizeUnit || "").toLowerCase();
  if (amount > 0 && amount <= 2500 && /^(g|gram|grams)$/.test(unit)) {
    return { grams: amount, label: String(raw?.householdServingFullText || `${amount} g serving`) };
  }
  return null;
}

async function cacheDefaultPortions(admin: any, stored: any[], sourceFoods: NormalizedFood[]) {
  const portions = stored.flatMap((saved) => {
    const source = sourceFoods.find((food) => food.source_id === saved.source_id && food.source_product_id === saved.source_product_id);
    const portion = source ? defaultPortion(source) : null;
    return portion ? [{ food_id: saved.id, label: portion.label, amount: 1, unit: "serving", gram_weight: portion.grams, is_default: true, source_description: `${saved.source_id} package serving` }] : [];
  });
  if (portions.length) await admin.from("food_portions").upsert(portions, { onConflict: "food_id,label,amount,unit" });
}

async function hydrateCachedBarcodePortion(admin: any, stored: any, barcode: string) {
  const { data: portions } = await admin.from("food_portions").select("id").eq("food_id", stored.id).limit(1);
  if (portions?.length || stored.source_id !== "open_food_facts") return;
  const fresh = await lookupOpenFoodFactsBarcode(barcode);
  if (fresh.length) await cacheDefaultPortions(admin, [stored], fresh);
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
      const candidates = barcodeCandidates(normalizedBarcode);
      for (const candidate of candidates) {
        const { data: alias } = await admin.from("food_barcode_aliases").select("food_id").eq("barcode", candidate).limit(1);
        if (alias?.[0]?.food_id) {
          const { data: aliased } = await admin.from("foods").select(foodSelect).eq("id", alias[0].food_id).limit(1);
          if (aliased?.length) {
            await hydrateCachedBarcodePortion(admin, aliased[0], candidate);
            return Response.json({ foods: aliased, source: "catalog", cached: true }, { headers: corsHeaders });
          }
        }
        const { data: saved } = await admin.from("foods").select(foodSelect).eq("barcode", candidate).limit(1);
        if (saved?.length) {
          await hydrateCachedBarcodePortion(admin, saved[0], candidate);
          return Response.json({ foods: saved, source: "catalog", cached: true }, { headers: corsHeaders });
        }
      }
      let external: NormalizedFood[] = [];
      let provider: "open_food_facts" | "usda" = "open_food_facts";
      for (const candidate of candidates) {
        external = await lookupOpenFoodFactsBarcode(candidate);
        if (external.length) break;
      }
      const usdaKey = Deno.env.get("USDA_FDC_API_KEY");
      if (!external.length && usdaKey) {
        external = await lookupUsdaBarcode(candidates, usdaKey);
        provider = "usda";
      }
      if (!external.length) {
        await recordBarcodeMiss(admin, normalizedBarcode);
        return Response.json({ foods: [], source: usdaKey ? "usda+open_food_facts" : "open_food_facts", cached: false }, { headers: corsHeaders });
      }
      const rows = external.map((food) => {
        const classification = classify(food);
        return {
          ...food,
          carb_speed_tier_id: classification.tier,
          carb_speed_confidence: classification.confidence,
          carb_speed_reason: classification.reason,
          data_quality_score: food.source_id === "usda" ? 88 : 68,
          is_verified: food.source_id === "usda",
        };
      });
      const { data: stored, error: storeError } = await admin.from("foods").upsert(rows, { onConflict: "source_id,source_product_id" }).select(foodSelect);
      if (storeError) throw storeError;
      await cacheDefaultPortions(admin, stored || [], external);
      if (stored?.[0]?.id) {
        await cacheBarcodeAliases(admin, [...new Set([...candidates, ...external.flatMap((food) => barcodeCandidates(food.barcode || ""))])], stored[0].id, provider);
      }
      return Response.json({ foods: stored || [], source: provider, cached: false }, { headers: corsHeaders });
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
      const { data: storedFoods, error: upsertError } = await admin.from("foods").upsert(rows, { onConflict: "source_id,source_product_id" }).select("id,source_id,source_product_id");
      if (upsertError) console.error("Food cache upsert failed", upsertError.message);
      else await cacheDefaultPortions(admin, storedFoods || [], external);
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
