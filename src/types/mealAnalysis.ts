import type { FuelFood } from "./fuel";

export type MealAnalysisItem = {
  id: string;
  name: string;
  lookupQuery: string;
  portionDescription: string;
  estimatedGrams: number;
  portionLowerGrams: number;
  portionUpperGrams: number;
  portionBasis: "count" | "package" | "geometry" | "user" | "unknown";
  detectedCount: number;
  detectedUnit: "piece" | "slice" | "tbsp" | "tsp" | "cup" | "unknown";
  requiresQuantityConfirmation: boolean;
  quantityQuestion: string;
  quantityOptions: string[];
  foodState: "raw" | "dry" | "cooked" | "prepared" | "unknown";
  foodConfidence: number;
  portionConfidence: number;
  visualEvidence: string;
  preparation: string;
  /** AI nutrition is retained only as a last-resort fallback when no catalog match exists. */
  fallbackNutritionPer100g: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  food: FuelFood;
  nutritionMatchConfidence: number;
  /** Deprecated compatibility fields. New scan totals come from item.food. */
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  fiber?: number;
  confidence?: number;
};
export type MealAnalysis = {
  mealName: string;
  items: MealAnalysisItem[];
  totals: { calories: number; carbs: number; protein: number; fat: number; fiber: number };
  ranges: { calories: [number, number]; carbs: [number, number]; protein: [number, number]; fat: [number, number]; fiber: [number, number] };
  confidence: number;
  uncertaintyPercent: number;
  hasReliableScaleReference: boolean;
  imageCount: number;
  captureQuality: "good" | "usable" | "poor";
  captureIssues: string[];
  needsUserInput: boolean;
  followUpQuestion: string;
  followUpOptions: string[];
  uncertainItemIds: string[];
  refinementToken: string;
  assumptions: string[];
  warnings: string[];
  disclaimer: string;
};
