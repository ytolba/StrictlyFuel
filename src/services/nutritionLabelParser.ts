import type { FoodLabelAnalysis } from "../types/foodCapture";
import { classifyCarbSpeed } from "../logic/nutritionEngine";

const n = (value: string | undefined) => {
  if (!value) return 0;
  const cleaned = value.replace(/[,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

function numberAfter(lines: string[], pattern: RegExp, unit?: "g" | "mg" | "kcal") {
  for (const line of lines) {
    if (!pattern.test(line)) continue;
    const match = line.match(/(\d+(?:\.\d+)?)\s*(kcal|mg|g)?/i);
    if (!match) continue;
    const value = n(match[1]);
    const foundUnit = (match[2] || "").toLowerCase();
    if (unit === "mg" && foundUnit === "g") return value * 1000;
    if (unit === "g" && foundUnit === "mg") return value / 1000;
    return value;
  }
  return 0;
}

function firstMeaningful(lines: string[], stop: number) {
  return lines.slice(0, stop).find((line) => line.length > 2 && !/^nutrition facts?$/i.test(line)) || "Packaged food";
}

/**
 * Turns OCR text into editable label fields. It intentionally never invents
 * missing numbers: anything not printed stays 0 and is marked for correction.
 */
export function parseNutritionLabelText(rawText: string): FoodLabelAnalysis {
  const lines = rawText.split(/\r?\n/).map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const text = lines.join(" ");
  const servingIndex = lines.findIndex((line) => /serving\s+size/i.test(line));
  const servingLine = servingIndex >= 0 ? lines[servingIndex] : "";
  const servingMatch = servingLine.match(/serving\s+size\s*[:\-]?\s*(.*)/i);
  const servingLabel = servingMatch?.[1]?.trim() || "1 serving";
  const grams = n((servingLine.match(/(\d+(?:\.\d+)?)\s*g\b/i) || [])[1]);
  const calories = numberAfter(lines, /\bcalories\b/i, "kcal") || numberAfter(lines, /\benergy\b/i, "kcal");
  const carbs = numberAfter(lines, /total\s+carbohydrate|carbohydrate/i, "g");
  const protein = numberAfter(lines, /\bprotein\b/i, "g");
  const fat = numberAfter(lines, /total\s+fat|\bfat\b/i, "g");
  const fiber = numberAfter(lines, /dietary\s+fiber|\bfiber\b/i, "g");
  const sugar = numberAfter(lines, /total\s+sugars?|\bsugars?\b/i, "g");
  const sugarAlcohols = numberAfter(lines, /sugar\s+alcohol|polyols/i, "g");
  const allulose = numberAfter(lines, /allulose/i, "g");
  const sodium = numberAfter(lines, /\bsodium\b/i, "mg");
  const ingredientsIndex = lines.findIndex((line) => /^ingredients?\s*[:\-]/i.test(line) || /\bingredients?\s*:/i.test(line));
  const ingredientsText = ingredientsIndex >= 0
    ? lines.slice(ingredientsIndex).join(" ").replace(/^.*?ingredients?\s*[:\-]\s*/i, "").split(/\bcontains?:/i)[0].trim()
    : "";
  const barcode = (text.match(/\b\d{8,14}\b/g) || []).sort((a, b) => b.length - a.length)[0] || "";
  const servingFactor = grams > 0 ? 100 / grams : 1;
  const classification = classifyCarbSpeed({
    name: firstMeaningful(lines, servingIndex >= 0 ? servingIndex : Math.min(3, lines.length)),
    ingredientsText,
    per100g: {
      calories: calories * servingFactor, carbs: carbs * servingFactor, protein: protein * servingFactor,
      fat: fat * servingFactor, fiber: fiber * servingFactor, sugar: sugar * servingFactor,
      sugarAlcohols: sugarAlcohols * servingFactor, allulose: allulose * servingFactor,
    },
  });
  const present = [grams, calories, carbs, protein, fat].filter((value) => value > 0).length;
  const confidence = Math.min(96, 42 + present * 9 + (ingredientsText ? 6 : 0) + (barcode ? 4 : 0));
  return {
    productName: firstMeaningful(lines, servingIndex >= 0 ? servingIndex : Math.min(3, lines.length)), brand: "", barcode,
    servingLabel, servingGrams: grams, caloriesPerServing: calories, carbsPerServing: carbs, proteinPerServing: protein,
    fatPerServing: fat, fiberPerServing: fiber, sugarPerServing: sugar, sugarAlcoholsPerServing: sugarAlcohols,
    sugarAlcoholType: (ingredientsText.match(/(erythritol|mannitol|isomalt|lactitol|maltitol|xylitol|sorbitol)/i)?.[1]?.toLowerCase() as FoodLabelAnalysis["sugarAlcoholType"]) || "unknown",
    allulosePerServing: allulose, sodiumMgPerServing: sodium, ingredientsText, carbSpeed: classification.tier,
    carbSpeedReason: classification.reason,
    confidence, needsCorrection: !grams || !calories || !carbs || !protein || !fat,
  };
}
