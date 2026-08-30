import type { ActivityType, MealIngredient, MealMacros, WorkoutDraft } from "./fuel";

export type RecoveryWindow = "standard" | "same_day" | "rapid";
export type RecoveryCategory =
  | "post_workout_light"
  | "post_workout_standard"
  | "post_workout_high_demand"
  | "post_workout_rapid_recovery";

export type RecoveryTarget = {
  category: RecoveryCategory;
  carbs: number;
  carbRange: [number, number];
  protein: number;
  proteinRange: [number, number];
  window: RecoveryWindow;
  timingHeadline: string;
  rationale: string;
  hydrationNote: string;
};

export type RecoveryIngredientRole = "protein" | "carb" | "produce" | "fat" | "topping";

export type RecoveryIngredientBlueprint = {
  foodId: string;
  grams: number;
  role: RecoveryIngredientRole;
  scalable?: boolean;
  minGrams?: number;
  maxGrams?: number;
  incrementGrams?: number;
};

export type RecoveryMealTemplate = {
  id: string;
  name: string;
  description: string;
  ingredients: RecoveryIngredientBlueprint[];
  instructions: string[];
  prepMinutes: number;
  difficulty: "easy" | "moderate";
  cuisine: string;
  mealType: "breakfast" | "lunch" | "dinner" | "light_meal";
  dietaryTags: string[];
  allergens: string[];
  activityTypes: ActivityType[];
  recoveryCategories: RecoveryCategory[];
  primaryCarbFoodId: string;
  primaryProteinFoodId: string;
  portionScalable: boolean;
};

export type RecoveryScore = {
  total: number;
  carbFit: number;
  proteinFit: number;
  recoveryFit: number;
  headline: string;
};

export type RecoveryMealRecommendation = {
  template: RecoveryMealTemplate;
  target: RecoveryTarget;
  ingredients: MealIngredient[];
  macros: MealMacros;
  score: RecoveryScore;
  rank: number;
  adjustmentSummary: string[];
};

export type RecoveryRecommendationInput = {
  workout: WorkoutDraft;
  window: RecoveryWindow;
};
