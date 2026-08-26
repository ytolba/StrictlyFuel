import { extractIngredients } from "../utils/CleanIngredients";
import { extractTextFromImage as extractWithAppleVision } from "../utils/AppleVisionOCR";
import { extractIngredientsFromImage as extractWithOpenAIVision } from "../utils/gptAPI";

export type ImageIngredientResult = {
  text: string;
  ingredients: string[];
  usedOpenAIFallback: boolean;
};

/** Apple Vision first; OpenAI vision only when the local result is unavailable. */
export const extractIngredientsWithFallback = async (
  imagePath: string,
  base64Image: string
): Promise<ImageIngredientResult> => {
  try {
    const text = await extractWithAppleVision(imagePath);
    const ingredients = extractIngredients(text);
    if (ingredients.length > 0) return { text, ingredients, usedOpenAIFallback: false };
  } catch (error) {
    console.warn("Apple Vision OCR unavailable; using OpenAI vision fallback", error);
  }

  const text = await extractWithOpenAIVision(base64Image);
  return { text, ingredients: extractIngredients(text), usedOpenAIFallback: true };
};
