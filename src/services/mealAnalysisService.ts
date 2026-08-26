import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";
import type { MealAnalysis } from "../types/mealAnalysis";

const analyzeMealPhotoFunction = httpsCallable<{ imageBase64: string; context?: string }, MealAnalysis>(functions, "analyzeMealPhoto");

export async function analyzeMealPhoto(imageBase64: string, context = ""): Promise<MealAnalysis> {
  const result = await analyzeMealPhotoFunction({ imageBase64, context });
  return result.data;
}
