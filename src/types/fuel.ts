export type ActivityType =
  | "running"
  | "cycling"
  | "swimming"
  | "triathlon"
  | "strength"
  | "crossfit"
  | "soccer"
  | "basketball"
  | "football"
  | "hiking"
  | "hyrox"
  | "endurance"
  | "other";

export type WorkoutIntensity = "easy" | "moderate" | "hard";
export type CarbSpeed = "fast" | "medium" | "slow";
export type DataSource = "strictly" | "usda" | "label" | "open_food_facts" | "ai_estimate";

export type WorkoutDraft = {
  id: string;
  activityType: ActivityType;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  startsInMinutes: number;
  bodyWeightKg: number;
  createdAt: string;
};

export type FuelTarget = {
  workoutId: string;
  carbTarget: number;
  carbRange: [number, number];
  gramsPerKgRange: [number, number];
  fastCarbs: number;
  mediumCarbs: number;
  slowCarbs: number;
  intraWorkout: { required: boolean; lowPerHour: number; highPerHour: number; note: string };
  timingLabel: string;
  rationale: string;
};

export type FuelFood = {
  id: string;
  name: string;
  aliases: string[];
  emoji: string;
  category: "fruit" | "grain" | "bread" | "sports" | "dairy" | "protein" | "fat";
  carbSpeed: CarbSpeed;
  timing: string;
  defaultGrams: number;
  servingLabel: string;
  per100g: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  source: DataSource;
  sourceId?: string;
};

export type MealIngredient = {
  id: string;
  food: FuelFood;
  grams: number;
  confidence?: number;
  estimated?: boolean;
};

export type MealMacros = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  fastCarbs: number;
  mediumCarbs: number;
  slowCarbs: number;
};

export type ScoreComponent = {
  id: "carbs" | "timing" | "distribution" | "comfort";
  label: string;
  score: number;
  maxScore: number;
  status: "excellent" | "good" | "adjust";
  detail: string;
};

export type MealScore = {
  total: number;
  headline: string;
  summary: string;
  components: ScoreComponent[];
};

export type MealFix = {
  id: string;
  action: "add" | "reduce";
  ingredientName: string;
  grams: number;
  detail: string;
};

export type FuelMeal = {
  id: string;
  userId: string;
  workoutId: string;
  name: string;
  imageUri?: string;
  ingredients: MealIngredient[];
  macros: MealMacros;
  score: MealScore;
  source: "manual" | "camera" | "copied" | "recommended";
  confidence?: number;
  isEstimate: boolean;
  createdAt: string;
};

export type PostVisibility = {
  workout: boolean;
  macros: boolean;
  ingredients: boolean;
};

export type FuelPost = {
  id: string;
  userId: string;
  username: string;
  meal: FuelMeal;
  workout: WorkoutDraft;
  target: FuelTarget;
  caption: string;
  visibility: PostVisibility;
  saves: number;
  copies: number;
  likes: number;
  createdAt: string;
  isDemo?: boolean;
};

export type CommunityFilters = {
  activityType?: ActivityType;
  durationBand?: "under45" | "45to90" | "90to120" | "over120";
  timingBand?: "under30" | "30to60" | "60to120" | "120to180" | "over180";
  carbBand?: "under30" | "30to60" | "60to90" | "90to120" | "over120";
  highScoreOnly?: boolean;
};
