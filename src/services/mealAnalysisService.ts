import { supabase } from "../lib/supabase";
import { throwFunctionError } from "./functionErrors";
import type { MealAnalysis } from "../types/mealAnalysis";
import type { FuelFood, MealIngredient } from "../types/fuel";
import { searchFoodCatalog } from "./foodCatalogService";
import { calculateMealMacros, classifyCarbSpeed } from "../logic/nutritionEngine";
import { householdAmountToGrams } from "../logic/householdMeasures";

function fallbackFood(item: any): FuelFood {
  const per100g = item.fallbackNutritionPer100g || { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
  const food: FuelFood = {
    id: `ai-fallback-${item.id}`,
    name: item.name,
    aliases: [], emoji: "◉",
    category: per100g.carbs >= per100g.protein ? "grain" : "protein",
    carbSpeed: "unknown", timing: "Photo estimate",
    defaultGrams: item.estimatedGrams || 100,
    servingLabel: item.portionDescription || "Estimated portion",
    per100g, source: "ai_estimate", dataQualityScore: 35, isVerified: false,
  };
  const classification = classifyCarbSpeed(food);
  food.carbSpeed = classification.tier;
  food.carbSpeedConfidence = classification.confidence;
  food.carbSpeedReason = classification.reason;
  food.timing = classification.reason;
  return food;
}

const words = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 1);

function preparationState(value: string): "raw" | "dry" | "cooked" | "prepared" | "unknown" {
  const text = value.toLowerCase();
  if (/\b(dry|uncooked|raw oats?|oat topping)\b/.test(text)) return "dry";
  if (/\b(raw|fresh uncooked)\b/.test(text)) return "raw";
  if (/\b(cooked|boiled|baked|grilled|steamed|prepared|oatmeal)\b/.test(text)) return "cooked";
  return "unknown";
}

function catalogMatchScore(food: FuelFood, item: any) {
  const query = `${item.lookupQuery || ""} ${item.name || ""}`.trim().toLowerCase();
  const queryWords = words(query);
  const candidate = `${food.name} ${food.aliases.join(" ")} ${food.category}`.toLowerCase();
  const candidateName = food.name.toLowerCase();
  let score = 0;
  if (candidateName === query) score += 120;
  if (query && candidateName.includes(query)) score += 55;
  const overlap = queryWords.filter((word) => candidate.includes(word)).length;
  score += overlap * 16;
  if (queryWords.length && overlap === queryWords.length) score += 30;

  const requestedState = item.foodState && item.foodState !== "unknown" ? item.foodState : preparationState(query);
  const candidateState = preparationState(candidateName);
  if (requestedState !== "unknown" && candidateState !== "unknown") {
    score += requestedState === candidateState || (requestedState === "prepared" && candidateState === "cooked") ? 38 : -95;
  }
  if (food.isVerified) score += 9;
  if (food.source === "strictly" || food.source === "usda") score += 7;
  return score;
}

function chooseNutritionMatch(matches: FuelFood[], item: any) {
  const ranked = matches.map((food) => ({ food, score: catalogMatchScore(food, item) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 34) return { food: undefined, confidence: 0 };
  const margin = best.score - (ranked[1]?.score ?? 0);
  const lexicalConfidence = Math.min(98, 58 + Math.max(0, margin) * 0.7 + Math.max(0, best.score - 45) * 0.22);
  const sourceCap = best.food.source === "usda" ? 95 : best.food.source === "strictly" ? 94 : best.food.source === "label" ? 90 : best.food.source === "open_food_facts" ? 80 : 55;
  return { food: best.food, confidence: Math.round(Math.min(sourceCap, best.food.dataQualityScore || sourceCap, lexicalConfidence)) };
}

function calibratedPortion(item: any) {
  const count = Number(item.detectedCount) || 0;
  const unit = String(item.detectedUnit || "unknown");
  const deterministic = count > 0 && ["piece", "slice"].includes(unit)
    ? householdAmountToGrams(String(item.name || ""), `${count} ${unit}${count === 1 ? "" : "s"}`)
    : null;
  if (deterministic) {
    return {
      estimatedGrams: deterministic.grams,
      portionLowerGrams: Math.max(1, Math.round(deterministic.grams * 0.95)),
      portionUpperGrams: Math.max(1, Math.round(deterministic.grams * 1.05)),
      portionConfidence: Math.max(92, Number(item.portionConfidence) || 0),
      portionBasis: "count",
    };
  }
  const estimate = Math.max(1, Number(item.estimatedGrams) || 1);
  return {
    estimatedGrams: estimate,
    portionLowerGrams: Math.max(1, Math.min(estimate, Number(item.portionLowerGrams) || estimate * 0.7)),
    portionUpperGrams: Math.max(estimate, Number(item.portionUpperGrams) || estimate * 1.35),
    portionConfidence: Number(item.portionConfidence) || 0,
    portionBasis: item.portionBasis || "unknown",
  };
}

async function resolveItem(item: any) {
  const matches = await searchFoodCatalog(item.lookupQuery || item.name).catch(() => []);
  const selected = chooseNutritionMatch(matches, item);
  const matched = selected.food;
  const portion = calibratedPortion(item);
  // The catalog supplies nutrition, but the scan UI should describe what the
  // camera actually saw instead of leaking a guessed catalog brand into it.
  let food = matched ? { ...matched, name: String(item.name || matched.name).slice(0, 80) } : fallbackFood(item);
  const observedClassification = classifyCarbSpeed(food);
  if (food.source !== "strictly" && observedClassification.confidence >= 80 && observedClassification.confidence > (food.carbSpeedConfidence || 0)) {
    food = { ...food, carbSpeed: observedClassification.tier, carbSpeedConfidence: observedClassification.confidence, carbSpeedReason: observedClassification.reason, timing: observedClassification.reason };
  }
  const nutritionMatchConfidence = matched ? selected.confidence : 35;
  return { ...item, ...portion, food, nutritionMatchConfidence };
}

export async function analyzeMealPhoto(imageInput: string | string[], context = "", refinementToken = ""): Promise<MealAnalysis> {
  const imagesBase64 = (Array.isArray(imageInput) ? imageInput : [imageInput]).filter(Boolean).slice(0, 2);
  const { data, error } = await supabase.functions.invoke("analyze-meal", { body: { imageBase64: imagesBase64[0], imagesBase64, context, refinementToken } });
  if (error) await throwFunctionError(error, data, "Meal analysis is unavailable. Please try again.");
  if (data?.error) throw new Error(data.error);
  if (!Array.isArray(data?.items)) throw new Error("The meal estimate returned an unexpected result.");
  const items = await Promise.all(data.items.map(resolveItem));
  const ingredientAt = (bound: "estimate" | "lower" | "upper"): MealIngredient[] => items.map((item: any) => ({
    id: `resolved-${item.id}`,
    food: item.food,
    grams: Math.max(1, bound === "lower" ? item.portionLowerGrams : bound === "upper" ? item.portionUpperGrams : item.estimatedGrams),
    confidence: Math.min(item.foodConfidence, item.portionConfidence, item.nutritionMatchConfidence),
    foodConfidence: item.foodConfidence,
    portionConfidence: item.portionConfidence,
    nutritionMatchConfidence: item.nutritionMatchConfidence,
    estimated: true,
  }));
  const ingredients = ingredientAt("estimate");
  const totals = calculateMealMacros(ingredients);
  const lowerTotals = calculateMealMacros(ingredientAt("lower"));
  const upperTotals = calculateMealMacros(ingredientAt("upper"));
  const rangeKeys: Array<"calories" | "carbs" | "protein" | "fat" | "fiber"> = ["calories", "carbs", "protein", "fat", "fiber"];
  const macroRanges = Object.fromEntries(rangeKeys.map((key) => [key, [Math.min(lowerTotals[key], upperTotals[key]), Math.max(lowerTotals[key], upperTotals[key])]]));
  return { ...data, items, totals, ranges: macroRanges } as MealAnalysis;
}
