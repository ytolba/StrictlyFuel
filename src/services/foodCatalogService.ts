import { searchFuelFoods } from "../data/fuelFoods";
import { supabase } from "../lib/supabase";
import type { FuelFood } from "../types/fuel";

type FoodRow = {
  id: string;
  source_id: FuelFood["source"];
  source_product_id?: string;
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  carb_speed_tier_id: FuelFood["carbSpeed"];
  carb_speed_reason?: string;
  calories_per_100g: number;
  carbs_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
};

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

const categories: FuelFood["category"][] = ["fruit", "grain", "bread", "sports", "dairy", "protein", "fat"];
const emoji: Record<FuelFood["category"], string> = {
  fruit: "🍌", grain: "🍚", bread: "🍞", sports: "⚡", dairy: "🥛", protein: "🍗", fat: "🥜",
};

function toFuelFood(row: FoodRow): FuelFood {
  const category = categories.includes(row.category as FuelFood["category"]) ? row.category as FuelFood["category"] : "grain";
  return {
    id: row.id,
    name: row.brand ? `${row.name} · ${row.brand}` : row.name,
    aliases: [],
    emoji: emoji[category],
    category,
    carbSpeed: row.carb_speed_tier_id || "medium",
    timing: row.carb_speed_reason || "Practical digestion estimate",
    defaultGrams: 100,
    servingLabel: "100 g",
    per100g: {
      calories: Number(row.calories_per_100g) || 0,
      carbs: Number(row.carbs_per_100g) || 0,
      protein: Number(row.protein_per_100g) || 0,
      fat: Number(row.fat_per_100g) || 0,
      fiber: Number(row.fiber_per_100g) || 0,
    },
    source: row.source_id,
    sourceId: row.source_product_id,
  };
}

export async function searchFoodCatalog(query: string): Promise<FuelFood[]> {
  const local = searchFuelFoods(query);
  const normalized = query.trim();
  if (normalized.length < 2) return local;
  try {
    const { data, error } = await supabase.functions.invoke("search-foods", { body: { query: normalized, limit: 25 } });
    if (error) throw error;
    const remote = ((data?.foods || []) as FoodRow[]).map(toFuelFood);
    const seen = new Set<string>();
    return [...local, ...remote].filter((food) => {
      const key = `${food.name.toLowerCase()}-${food.sourceId || food.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((food) => ({ food, score: relevance(food, normalized) }))
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
  return toFuelFood(data.foods[0] as FoodRow);
}
