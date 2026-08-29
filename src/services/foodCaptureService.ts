import { supabase } from "../lib/supabase";
import { throwFunctionError } from "./functionErrors";
import type { FoodLabelAnalysis } from "../types/foodCapture";
import type { FuelFood } from "../types/fuel";

export async function analyzeFoodLabel(imageBase64: string): Promise<FoodLabelAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-food-label", { body: { action: "analyze", imageBase64 } });
  if (error) await throwFunctionError(error, data, "The label could not be read.");
  if (data?.error) throw new Error(data.error);
  return data as FoodLabelAnalysis;
}

export async function saveFoodLabel(food: FoodLabelAnalysis): Promise<FuelFood> {
  const { data, error } = await supabase.functions.invoke("analyze-food-label", { body: { action: "save", food } });
  if (error) await throwFunctionError(error, data, "The product could not be saved.");
  const row = data.food;
  const grams = Math.max(1, food.servingGrams);
  const factor = grams / 100;
  return {
    id: row.id, name: food.brand ? `${food.productName} · ${food.brand}` : food.productName, aliases: [], emoji: "▣",
    category: "grain", carbSpeed: food.carbSpeed, timing: food.carbSpeedReason,
    defaultGrams: grams, servingLabel: food.servingLabel,
    per100g: {
      calories: food.caloriesPerServing / factor, carbs: food.carbsPerServing / factor,
      protein: food.proteinPerServing / factor, fat: food.fatPerServing / factor, fiber: food.fiberPerServing / factor,
    }, source: "label", sourceId: row.source_product_id,
  };
}
