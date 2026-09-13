import { searchFuelFoods } from "../data/fuelFoods";
import { supabase } from "../lib/supabase";
import type { FuelFood } from "../types/fuel";
import { classifyCarbSpeed } from "../logic/nutritionEngine";

type FoodRow = {
  id: string;
  source_id: FuelFood["source"];
  source_product_id?: string;
  barcode?: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  carb_speed_tier_id: FuelFood["carbSpeed"];
  carb_speed_confidence?: number;
  carb_speed_reason?: string;
  calories_per_100g: number;
  carbs_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sugar_per_100g?: number;
  soluble_fiber_per_100g?: number;
  insoluble_fiber_per_100g?: number;
  sugar_alcohols_per_100g?: number;
  sugar_alcohol_type?: FuelFood["per100g"]["sugarAlcoholType"];
  allulose_per_100g?: number;
  alcohol_per_100g?: number;
  data_quality_score?: number;
  is_verified?: boolean;
  default_portion_label?: string;
  default_portion_grams?: number;
};

type PortionRow = { food_id: string; label: string; gram_weight: number; is_default: boolean };

const queryAliases: Record<string, string[]> = {
  rice: ["rice", "jasmine", "basmati"], oatmeal: ["oatmeal", "oats"], oats: ["oats", "oatmeal"],
  bread: ["bread", "toast", "bagel", "english muffin"], juice: ["juice"], gel: ["gel", "energy gel"],
  potato: ["potato"], cereal: ["cereal", "corn flakes", "rice cereal"], pasta: ["pasta", "spaghetti", "noodles"],
};

const normalizedWords = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 1);

function relevance(food: FuelFood, query: string) {
  const normalized = query.trim().toLowerCase();
  const words = normalizedWords(normalized);
  const haystack = `${food.name} ${food.aliases.join(" ")} ${food.category}`.toLowerCase();
  const name = food.name.toLowerCase();
  let score = 0;
  if (name === normalized) score += 100;
  if (name.startsWith(normalized)) score += 55;
  if (name.includes(normalized)) score += 35;
  score += words.filter((word) => haystack.includes(word)).length * 14;
  if (words.length && words.every((word) => haystack.includes(word))) score += 25;
  const related = queryAliases[normalized] || [];
  if (related.some((word) => haystack.includes(word))) score += 10;
  if (food.source === "strictly" || food.source === "usda") score += 6;
  return score;
}

const categories: FuelFood["category"][] = ["fruit", "vegetable", "grain", "bread", "sports", "dairy", "protein", "fat", "sauce"];
const emoji: Record<FuelFood["category"], string> = {
  fruit: "🍌", vegetable: "🥦", grain: "🍚", bread: "🍞", sports: "⚡", dairy: "🥛", protein: "🍗", fat: "🥜", sauce: "🥣",
};

function toFuelFood(row: FoodRow): FuelFood {
  const category = categories.includes(row.category as FuelFood["category"]) ? row.category as FuelFood["category"] : "grain";
  const servingGrams = Number(row.default_portion_grams);
  const defaultGrams = Number.isFinite(servingGrams) && servingGrams > 0 ? servingGrams : 100;
  const draft: FuelFood = {
    id: row.id,
    name: row.brand ? `${row.name} · ${row.brand}` : row.name,
    aliases: [],
    emoji: emoji[category],
    category,
    carbSpeed: row.carb_speed_tier_id || "unknown",
    carbSpeedConfidence: Number(row.carb_speed_confidence) || 0,
    carbSpeedReason: row.carb_speed_reason || undefined,
    timing: row.carb_speed_reason || "Not enough evidence to classify digestion speed",
    defaultGrams,
    servingLabel: row.default_portion_label?.trim() || (defaultGrams === 100 ? "100 g" : `${Math.round(defaultGrams)} g serving`),
    ingredientsText: row.description?.trim() || undefined,
    per100g: {
      calories: Number(row.calories_per_100g) || 0,
      carbs: Number(row.carbs_per_100g) || 0,
      protein: Number(row.protein_per_100g) || 0,
      fat: Number(row.fat_per_100g) || 0,
      fiber: Number(row.fiber_per_100g) || 0,
      sugar: row.sugar_per_100g == null ? undefined : Number(row.sugar_per_100g),
      solubleFiber: Number(row.soluble_fiber_per_100g) || undefined,
      insolubleFiber: Number(row.insoluble_fiber_per_100g) || undefined,
      sugarAlcohols: Number(row.sugar_alcohols_per_100g) || undefined,
      sugarAlcoholType: row.sugar_alcohol_type || undefined,
      allulose: Number(row.allulose_per_100g) || undefined,
      alcohol: Number(row.alcohol_per_100g) || undefined,
    },
    source: row.source_id,
    sourceId: row.source_product_id,
    dataQualityScore: Number(row.data_quality_score) || undefined,
    isVerified: Boolean(row.is_verified),
  };
  if (draft.source === "strictly" && draft.carbSpeed !== "unknown") return draft;
  const inferred = classifyCarbSpeed(draft);
  const databaseConfidence = draft.carbSpeedConfidence || 0;
  if (inferred.confidence >= 80 && inferred.confidence > databaseConfidence) {
    return { ...draft, carbSpeed: inferred.tier, carbSpeedConfidence: inferred.confidence, carbSpeedReason: inferred.reason, timing: inferred.reason };
  }
  if (databaseConfidence < 75) {
    return { ...draft, carbSpeed: "unknown", carbSpeedConfidence: 0, carbSpeedReason: inferred.reason, timing: inferred.reason };
  }
  return draft;
}

async function addDefaultPortions(rows: FoodRow[]): Promise<FoodRow[]> {
  const ids = [...new Set(rows.map((row) => row.id).filter(Boolean))];
  if (!ids.length) return rows;
  const { data, error } = await supabase
    .from("food_portions")
    .select("food_id,label,gram_weight,is_default")
    .in("food_id", ids)
    .order("is_default", { ascending: false });
  if (error || !data?.length) return rows;
  const byFood = new Map<string, PortionRow>();
  (data as PortionRow[]).forEach((portion) => {
    if (!byFood.has(portion.food_id)) byFood.set(portion.food_id, portion);
  });
  return rows.map((row) => {
    const portion = byFood.get(row.id);
    return portion ? { ...row, default_portion_label: portion.label, default_portion_grams: portion.gram_weight } : row;
  });
}

const canonicalFoodKey = (food: FuelFood) => {
  const name = food.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${name}|${Math.round(food.per100g.carbs * 10)}|${Math.round(food.per100g.calories)}`;
};

function uniqueFoods(foods: FuelFood[]) {
  const seen = new Set<string>();
  return foods.filter((food) => {
    const key = canonicalFoodKey(food);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchFoodCatalog(query: string): Promise<FuelFood[]> {
  const local = searchFuelFoods(query);
  const normalized = query.trim();
  if (normalized.length < 2) return local;
  try {
    const { data, error } = await supabase.functions.invoke("search-foods", { body: { query: normalized, limit: 25 } });
    if (error) throw error;
    const remote = (await addDefaultPortions((data?.foods || []) as FoodRow[])).map(toFuelFood);
    return uniqueFoods([...local, ...remote]).map((food) => ({ food, score: relevance(food, normalized) }))
      .filter(({ score, food }) => score >= 14 || food.source === "strictly")
      .sort((a, b) => b.score - a.score)
      .map(({ food }) => food)
      .slice(0, 25);
  } catch {
    return local;
  }
}

export async function lookupFoodBarcode(barcode: string): Promise<FuelFood | null> {
  const normalized = barcode.replace(/\D/g, "");
  if (normalized.length < 8) return null;
  const { data, error } = await supabase.functions.invoke("search-foods", { body: { barcode: normalized, limit: 5 } });
  if (error || !data?.foods?.length) return null;
  const [row] = await addDefaultPortions([data.foods[0] as FoodRow]);
  return toFuelFood(row);
}
