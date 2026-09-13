export type ActivityType =
  | "running"
  | "trail_running"
  | "walking"
  | "indoor_cycling"
  | "mountain_biking"
  | "cycling"
  | "swimming"
  | "rowing"
  | "elliptical"
  | "stair_climber"
  | "triathlon"
  | "sprint_triathlon"
  | "olympic_triathlon"
  | "ironman_70_3"
  | "ironman"
  | "brick_workout"
  | "swim_bike"
  | "bike_run"
  | "strength"
  | "bodybuilding"
  | "powerlifting"
  | "olympic_weightlifting"
  | "strength_training"
  | "calisthenics"
  | "circuit_training"
  | "crossfit"
  | "hiit"
  | "bootcamp"
  | "functional_fitness"
  | "conditioning"
  | "soccer"
  | "basketball"
  | "football"
  | "rugby"
  | "hockey"
  | "lacrosse"
  | "volleyball"
  | "baseball"
  | "softball"
  | "tennis"
  | "pickleball"
  | "badminton"
  | "squash"
  | "racquetball"
  | "boxing"
  | "kickboxing"
  | "muay_thai"
  | "wrestling"
  | "brazilian_jiu_jitsu"
  | "mma"
  | "martial_arts"
  | "hiking"
  | "hyrox"
  | "skiing"
  | "snowboarding"
  | "cross_country_skiing"
  | "climbing"
  | "surfing"
  | "kayaking"
  | "paddleboarding"
  | "general_cardio"
  | "mixed_training"
  | "endurance"
  | "other";

export type WorkoutIntensity = "easy" | "moderate" | "hard";
export type HeartRateZone = 1 | 2 | 3 | 4 | 5;
export type CarbSpeed = "fast" | "medium" | "slow" | "unknown";
export type DataSource = "strictly" | "usda" | "label" | "open_food_facts" | "ai_estimate";

export type WorkoutDraft = {
  id: string;
  activityType: ActivityType;
  durationMinutes: number;
  intensity: WorkoutIntensity;
  startsInMinutes: number;
  bodyWeightKg: number;
  /** Optional planned zones. Multiple values support intervals and mixed sessions. */
  heartRateZones?: HeartRateZone[];
  /** Present only when recovery is being built from a completed Apple Health workout. */
  completedWorkout?: {
    source: "apple_health";
    id: string;
    completedAt: string;
    sourceName?: string;
    distanceKm?: number;
    activeCalories?: number;
    averageHeartRate?: number;
    maxHeartRate?: number;
  };
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
  /** Versioned because the practical availability model will evolve with evidence and user feedback. */
  availabilityModelVersion?: string;
};

export type FuelFood = {
  id: string;
  name: string;
  aliases: string[];
  emoji: string;
  category: "fruit" | "vegetable" | "grain" | "bread" | "sports" | "dairy" | "protein" | "fat" | "sauce";
  carbSpeed: CarbSpeed;
  /** Confidence in the practical carb-speed classification, separate from macro accuracy. */
  carbSpeedConfidence?: number;
  carbSpeedReason?: string;
  timing: string;
  defaultGrams: number;
  servingLabel: string;
  /** Printed package ingredients when a catalog or captured label provides them. */
  ingredientsText?: string;
  per100g: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    /** Total sugars, only when the source explicitly supplies it. */
    sugar?: number;
    /** Optional detailed carbohydrates. Only populated when the source provides them. */
    solubleFiber?: number;
    insolubleFiber?: number;
    sugarAlcohols?: number;
    sugarAlcoholType?: "erythritol" | "mannitol" | "isomalt" | "lactitol" | "maltitol" | "xylitol" | "sorbitol" | "hydrogenated_starch_hydrolysates" | "unknown";
    allulose?: number;
    alcohol?: number;
  };
  source: DataSource;
  sourceId?: string;
  dataQualityScore?: number;
  isVerified?: boolean;
};

export type MealIngredient = {
  id: string;
  food: FuelFood;
  grams: number;
  confidence?: number;
  foodConfidence?: number;
  portionConfidence?: number;
  nutritionMatchConfidence?: number;
  estimated?: boolean;
  /** Identifier from the vision result, retained while the athlete reviews a scan. */
  analysisItemId?: string;
  /** Plausible visual portion interval before the athlete confirms the amount. */
  gramsRange?: [number, number];
  /** Dense, hidden, or otherwise high-impact amounts must be reviewed before scoring. */
  requiresQuantityConfirmation?: boolean;
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
  /** Carbohydrate that could not be assigned responsibly from available evidence. */
  unclassifiedCarbs: number;
  /** Carbohydrate counted toward workout fuel after excluding non-fuelling polyols/allulose. */
  availableCarbs?: number;
  /** Confidence in the fast/medium/slow estimate, not in the macro totals. */
  carbSpeedConfidence?: number;
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
  /** Confidence in the availability portion of the score. */
  confidence?: number;
  /** True when the athlete should confirm foods before relying on the availability split. */
  provisional?: boolean;
};

export type MealFix = {
  id: string;
  action: "increase" | "add" | "top_up" | "reduce";
  ingredientName: string;
  grams: number;
  detail: string;
  /** Existing meal item to adjust, when this is an increase/reduction. */
  ingredientId?: string;
  foodId?: string;
  carbImpact?: number;
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
