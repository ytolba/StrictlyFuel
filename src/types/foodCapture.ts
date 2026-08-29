import type { CarbSpeed, FuelFood } from "./fuel";

export type FoodLabelAnalysis = {
  productName: string;
  brand: string;
  barcode: string;
  servingLabel: string;
  servingGrams: number;
  caloriesPerServing: number;
  carbsPerServing: number;
  proteinPerServing: number;
  fatPerServing: number;
  fiberPerServing: number;
  sugarPerServing: number;
  sodiumMgPerServing: number;
  ingredientsText: string;
  carbSpeed: CarbSpeed;
  carbSpeedReason: string;
  confidence: number;
  needsCorrection: boolean;
};

export type CapturedFoodResult = { food: FuelFood; reviewStatus: "pending" | "verified" };
