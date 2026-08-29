import { supabase } from "../lib/supabase";
import { throwFunctionError } from "./functionErrors";
import type { MealAnalysis } from "../types/mealAnalysis";

export async function analyzeMealPhoto(imageBase64: string, context = ""): Promise<MealAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-meal", { body: { imageBase64, context } });
  if (error) await throwFunctionError(error, data, "Meal analysis is unavailable. Please try again.");
  if (data?.error) throw new Error(data.error);
  if (!Array.isArray(data?.items)) throw new Error("The meal estimate returned an unexpected result.");
  return data as MealAnalysis;
}
