import { searchFuelFoods } from "../data/fuelFoods";
import { supabase } from "../lib/supabase";
import type { FuelFood } from "../types/fuel";

type FoodRow = {
  id: string;
  source_id: FuelFood["source"];
  source_product_id?: string;
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
    }).slice(0, 25);
  } catch {
    return local;
  }
}
