export type NutritionProfile = {
  sensitivities: string[];
  conditions: string[];
  dietaryPatterns: string[];
  priorities: string[];
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
];

export const CONDITION_OPTIONS: ProfileOption[] = [
  { id: "celiac", label: "Celiac disease" },
  { id: "blood_sugar", label: "Blood sugar / diabetes" },
  { id: "hypertension", label: "High blood pressure" },
  { id: "ibs", label: "IBS / FODMAP sensitivity" },
  { id: "kidney", label: "Kidney-related limits" },
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
];

export const EMPTY_NUTRITION_PROFILE: NutritionProfile = {
  sensitivities: [],
  conditions: [],
  dietaryPatterns: [],
  priorities: [],
  updatedAt: "",
};

export const hasNutritionPreferences = (profile: NutritionProfile) =>
  profile.sensitivities.length +
    profile.conditions.length +
    profile.dietaryPatterns.length +
    profile.priorities.length >
  0;
