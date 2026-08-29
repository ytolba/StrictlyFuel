export type NutritionProfile = {
  sensitivities: string[];
  conditions: string[];
  dietaryPatterns: string[];
  priorities: string[];
  measurementSystem: "imperial" | "metric";
  bodyWeightKg: number | null;
  heightCm: number | null;
  healthInsightsEnabled: boolean;
  updatedAt: string;
};

export type ProfileOption = {
  id: string;
  label: string;
  keywords?: string[];
};

export const SENSITIVITY_OPTIONS: ProfileOption[] = [
  { id: "gluten", label: "Gluten", keywords: ["wheat", "barley", "rye", "malt", "gluten"] },
  { id: "dairy", label: "Dairy", keywords: ["milk", "whey", "casein", "lactose", "butter", "cream", "cheese"] },
  { id: "peanuts", label: "Peanuts", keywords: ["peanut", "groundnut"] },
  { id: "tree_nuts", label: "Tree nuts", keywords: ["almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia"] },
  { id: "eggs", label: "Eggs", keywords: ["egg", "albumen", "mayonnaise"] },
  { id: "soy", label: "Soy", keywords: ["soy", "soya", "tofu", "edamame"] },
  { id: "shellfish", label: "Shellfish", keywords: ["shrimp", "prawn", "crab", "lobster", "shellfish"] },
  { id: "sesame", label: "Sesame", keywords: ["sesame", "tahini"] },
  { id: "lactose", label: "Lactose", keywords: ["milk", "lactose", "whey", "cream"] },
  { id: "fructose", label: "High-fructose foods", keywords: ["fructose", "high fructose", "agave"] },
  { id: "sugar_alcohols", label: "Sugar alcohols", keywords: ["sorbitol", "xylitol", "maltitol", "erythritol"] },
  { id: "high_fiber", label: "High fiber near training" },
  { id: "high_fat", label: "High fat near training" },
  { id: "spicy", label: "Spicy foods" },
  { id: "caffeine", label: "Caffeine" },
];

export const CONDITION_OPTIONS: ProfileOption[] = [
  { id: "celiac", label: "Celiac disease" },
  { id: "blood_sugar", label: "Blood sugar / diabetes" },
  { id: "hypertension", label: "High blood pressure" },
  { id: "ibs", label: "IBS / FODMAP sensitivity" },
  { id: "kidney", label: "Kidney-related limits" },
  { id: "gerd", label: "Reflux / GERD" },
  { id: "crohns_colitis", label: "Crohn’s / colitis" },
  { id: "migraine_triggers", label: "Food-triggered migraines" },
  { id: "none", label: "None of these" },
];

export const DIETARY_PATTERN_OPTIONS: ProfileOption[] = [
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "plant_forward", label: "Plant-forward" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
];

export const PRIORITY_OPTIONS: ProfileOption[] = [
  { id: "minimally_processed", label: "Minimally processed" },
  { id: "short_list", label: "Short ingredient lists" },
  { id: "low_added_sugar", label: "Lower added sugar" },
  { id: "lower_sodium", label: "Lower sodium" },
  { id: "no_artificial_colors", label: "No artificial colors" },
  { id: "no_artificial_sweeteners", label: "No artificial sweeteners" },
  { id: "higher_protein", label: "Higher protein" },
  { id: "low_fiber_preworkout", label: "Low fiber before training" },
  { id: "gentle_stomach", label: "Gentle on my stomach" },
  { id: "portable", label: "Easy to carry" },
  { id: "budget", label: "Budget-friendly" },
];

export const EMPTY_NUTRITION_PROFILE: NutritionProfile = {
  sensitivities: [],
  conditions: [],
  dietaryPatterns: [],
  priorities: [],
  measurementSystem: "imperial",
  bodyWeightKg: null,
  heightCm: null,
  healthInsightsEnabled: false,
  updatedAt: "",
};

export const hasNutritionPreferences = (profile: NutritionProfile) =>
  profile.sensitivities.length +
    profile.conditions.length +
    profile.dietaryPatterns.length +
    profile.priorities.length >
  0;
