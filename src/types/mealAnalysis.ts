export type MealAnalysisItem = { id: string; name: string; portionDescription: string; estimatedGrams: number; calories: number; carbs: number; protein: number; fat: number; confidence: number; visualEvidence: string };
export type MealAnalysis = {
  mealName: string;
  items: MealAnalysisItem[];
  totals: { calories: number; carbs: number; protein: number; fat: number };
  ranges: { calories: [number, number]; carbs: [number, number]; protein: [number, number]; fat: [number, number] };
  confidence: number;
  needsUserInput: boolean;
  followUpQuestion: string;
  assumptions: string[];
  warnings: string[];
  disclaimer: string;
};
