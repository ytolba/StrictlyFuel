import { supabase } from "../lib/supabase";
import { throwFunctionError } from "./functionErrors";
import type { MealAnalysis } from "../types/mealAnalysis";
import type { FuelFood, MealIngredient, MealMacros } from "../types/fuel";
import { searchFoodCatalog } from "./foodCatalogService";
import { calculateMealMacros, inferCarbSpeed } from "../logic/nutritionEngine";

const range = (value: number, uncertainty: number): [number, number] => [
  Math.round(value * (1 - uncertainty / 100) * 10) / 10,
  Math.round(value * (1 + uncertainty / 100) * 10) / 10,
];

function fallbackFood(item: any): FuelFood {
  const per100g = item.fallbackNutritionPer100g || { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
  const food: FuelFood = {
    id: `ai-fallback-${item.id}`,
    name: item.name,
    aliases: [], emoji: "◉",
    category: per100g.carbs >= per100g.protein ? "grain" : "protein",
    carbSpeed: "medium", timing: "Photo estimate",
    defaultGrams: item.estimatedGrams || 100,
    servingLabel: item.portionDescription || "Estimated portion",
    per100g, source: "ai_estimate", dataQualityScore: 35, isVerified: false,
  };
  food.carbSpeed = inferCarbSpeed(food);
  return food;
}

async function resolveItem(item: any) {
  const matches = await searchFoodCatalog(item.lookupQuery || item.name).catch(() => []);
  const food = matches[0] || fallbackFood(item);
  const sourceConfidence = food.source === "usda" ? 94 : food.source === "strictly" ? 90 : food.source === "open_food_facts" ? 72 : food.source === "label" ? 78 : 35;
  return { ...item, food, nutritionMatchConfidence: Math.min(sourceConfidence, food.dataQualityScore || sourceConfidence) };
}

export async function analyzeMealPhoto(imageBase64: string, context = ""): Promise<MealAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-meal", { body: { imageBase64, context } });
  if (error) await throwFunctionError(error, data, "Meal analysis is unavailable. Please try again.");
  if (data?.error) throw new Error(data.error);
  if (!Array.isArray(data?.items)) throw new Error("The meal estimate returned an unexpected result.");
  const items = await Promise.all(data.items.map(resolveItem));
  const ingredients: MealIngredient[] = items.map((item: any) => ({
    id: `resolved-${item.id}`,
    food: item.food,
    grams: Math.max(1, item.estimatedGrams),
    confidence: Math.min(item.foodConfidence, item.portionConfidence, item.nutritionMatchConfidence),
    foodConfidence: item.foodConfidence,
    portionConfidence: item.portionConfidence,
    nutritionMatchConfidence: item.nutritionMatchConfidence,
    estimated: true,
  }));
  const totals = calculateMealMacros(ingredients);
  const avgPortionConfidence = items.length ? items.reduce((sum: number, item: any) => sum + item.portionConfidence, 0) / items.length : 50;
  const uncertainty = Math.max(Number(data.uncertaintyPercent) || 20, 100 - avgPortionConfidence);
  const macroRanges = Object.fromEntries((Object.keys(totals) as (keyof MealMacros)[]).filter((key) => ["calories", "carbs", "protein", "fat", "fiber"].includes(key)).map((key) => [key, range(totals[key], uncertainty)]));
  return { ...data, items, totals, ranges: macroRanges } as MealAnalysis;
}
