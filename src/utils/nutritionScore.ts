import {
  CONDITION_OPTIONS,
  DIETARY_PATTERN_OPTIONS,
  NutritionProfile,
  PRIORITY_OPTIONS,
  SENSITIVITY_OPTIONS,
  hasNutritionPreferences,
} from "../types/nutritionProfile";

export type ScoreMetric = {
  key: "quality" | "processing" | "fit";
  number: "01" | "02" | "03";
  title: string;
  score: number;
  summary: string;
  details: ScoreFlag[];
};

export type ScoreFlag = {
  ingredient: string;
  tier: string;
  impact: string;
  explanation: string;
  sourceUrl?: string;
};

export type NutritionScore = {
  score: number | null;
  generalScore: number | null;
  fitScore: number | null;
  label: string;
  summary: string;
  fitLabel: string;
  notAFit: boolean;
  isPersonalized: boolean;
  matchedPreferences: string[];
  metrics: ScoreMetric[];
};

type ScoreInput = {
  ingredients: string[];
  details?: string;
  rawText?: string;
  unknown?: boolean;
  profile: NutritionProfile;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const containsAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));
const labelsFor = (ids: string[], options: { id: string; label: string }[]) =>
  ids.map((id) => options.find((option) => option.id === id)?.label).filter(Boolean) as string[];

/**
 * Ingredient evidence tiers. Multipliers are intentionally applied per
 * distinct matched ingredient so multiple high-concern signals compound.
 * These are ranking heuristics, not medical diagnoses or universal safety
 * determinations; each flag carries a source link for review.
 */
export const INGREDIENT_TIERS = [
  {
    id: "critical",
    label: "Critical concern",
    qualityMultiplier: 0.35,
    processingMultiplier: 0.55,
    terms: ["partially hydrogenated", "trans fat", "brominated vegetable oil", "potassium bromate"],
    explanation: "A high-priority formulation signal that sharply lowers the ingredient-quality and processing scores.",
    sourceUrl: "https://www.fda.gov/food/food-additives-petitions/trans-fat",
  },
  {
    id: "high",
    label: "High concern",
    qualityMultiplier: 0.58,
    processingMultiplier: 0.7,
    terms: [
      "high fructose corn syrup", "red 40", "yellow 5", "yellow 6", "blue 1", "blue 2",
      "aspartame", "sucralose", "acesulfame", "saccharin", "bha", "bht", "tbhq",
      "sodium nitrite", "sodium nitrate",
    ],
    explanation: "A high-concern additive or sweetener signal. The score is reduced sharply, while the specific ingredient remains visible for context.",
    sourceUrl: "https://www.fda.gov/food/color-additives-information-consumers/color-additives-questions-and-answers-consumers",
  },
  {
    id: "moderate",
    label: "Moderate concern",
    qualityMultiplier: 0.82,
    processingMultiplier: 0.84,
    terms: [
      "sugar", "corn syrup", "dextrose", "maltodextrin", "artificial flavor", "modified food starch",
      "fructose", "glucose syrup", "cane syrup", "polysorbate", "carrageenan", "silicon dioxide", "preservative", "emulsifier", "hydrogenated oil",
    ],
    explanation: "A formulation or added-sugar signal that brings the score down without dominating it on its own.",
    sourceUrl: "https://www.fda.gov/food/food-labeling-nutrition/added-sugars-nutrition-facts-label",
  },
  {
    id: "watch",
    label: "Watch",
    qualityMultiplier: 0.93,
    processingMultiplier: 0.95,
    terms: ["natural flavor", "flavoring", "xanthan gum", "guar gum", "soy lecithin"],
    explanation: "A lower-weight formulation signal. It is shown for transparency but does not decide the score by itself.",
    sourceUrl: "https://www.fda.gov/food/food-additives-petitions/food-additives-and-ingredients",
  },
] as const;

export const scoreIngredients = ({
  ingredients,
  details = "",
  rawText = "",
  unknown = false,
  profile,
}: ScoreInput): NutritionScore => {
  const ingredientText = ingredients.join(", ").toLowerCase();
  // Keep scoring anchored to the captured ingredient evidence. AI prose can
  // mention an ingredient as an example and should not change the score.
  // Prefer parsed ingredient names. OCR/nutrition prose is only a fallback
  // when parsing produced no names, so a line like “Total sugars” cannot
  // accidentally score as an ingredient.
  const evidence = ingredientText.trim() || rawText.toLowerCase();
  const hasIngredientEvidence = ingredients.length > 0 || rawText.trim().length > 3;

  if (unknown || !hasIngredientEvidence) {
    return {
      score: null,
      generalScore: null,
      fitScore: null,
      label: "Not enough information",
      summary: "Capture a clear ingredient list to generate a score.",
      fitLabel: "Add your profile",
      notAFit: false,
      isPersonalized: hasNutritionPreferences(profile),
      matchedPreferences: [],
      metrics: [],
    };
  }

  const wholeFoodSignals = [
    "oat", "fruit", "vegetable", "bean", "lentil", "chickpea", "nut", "seed",
    "whole grain", "olive oil", "avocado", "herb", "spice",
  ];
  const sugarSignals = ["sugar", "corn syrup", "fructose", "dextrose", "glucose syrup", "cane syrup"];

  let quality = 96;
  let processing = 96;
  const qualityFlags: ScoreFlag[] = [];
  const processingFlags: ScoreFlag[] = [];

  INGREDIENT_TIERS.forEach((tier) => {
    const matches = tier.terms.filter((term) => evidence.includes(term));
    matches.forEach((term) => {
      quality *= tier.qualityMultiplier;
      processing *= tier.processingMultiplier;
      const flag = {
        ingredient: term,
        tier: tier.label,
        impact: `${Math.round((1 - tier.qualityMultiplier) * 100)}% quality weight`,
        explanation: tier.explanation,
        sourceUrl: tier.sourceUrl,
      } satisfies ScoreFlag;
      qualityFlags.push(flag);
      processingFlags.push({
        ...flag,
        impact: `${Math.round((1 - tier.processingMultiplier) * 100)}% processing weight`,
      });
    });
  });

  if (containsAny(evidence, wholeFoodSignals)) {
    quality += 4;
    processing += 4;
  } else {
    quality -= 4;
    processing -= 2;
  }
  if (ingredients.length > 12) {
    const listPenalty = Math.min(24, (ingredients.length - 12) * 2);
    quality -= listPenalty;
    processing -= listPenalty;
    const flag = {
      ingredient: `${ingredients.length} ingredients`,
      tier: "Long label",
      impact: `${listPenalty} point deduction`,
      explanation: "A longer ingredient list usually indicates more formulation complexity, so it lowers both clarity and processing scores.",
    } satisfies ScoreFlag;
    qualityFlags.push(flag);
    processingFlags.push(flag);
  }
  quality = clamp(quality);
  processing = clamp(processing);

  let fit = 100;
  const matches: string[] = [];
  const addMatch = (label: string, deduction: number) => {
    if (!matches.includes(label)) matches.push(label);
    fit -= deduction;
  };

  profile.sensitivities.forEach((id) => {
    const option = SENSITIVITY_OPTIONS.find((item) => item.id === id);
    if (option?.keywords && containsAny(evidence, option.keywords)) addMatch(option.label, 48);
  });

  if (profile.conditions.includes("celiac") && containsAny(evidence, ["wheat", "barley", "rye", "malt", "gluten"])) addMatch("Celiac profile", 50);
  if (profile.conditions.includes("blood_sugar") && containsAny(evidence, sugarSignals)) addMatch("Blood sugar priority", 20);
  if (profile.conditions.includes("hypertension") && containsAny(evidence, ["salt", "sodium", "monosodium glutamate"])) addMatch("Sodium priority", 17);
  if (profile.conditions.includes("ibs") && containsAny(evidence, ["inulin", "chicory root", "onion", "garlic", "sorbitol", "mannitol", "xylitol"])) addMatch("IBS / FODMAP profile", 20);
  if (profile.conditions.includes("kidney") && containsAny(evidence, ["potassium chloride", "phosphate", "phosphoric acid", "sodium phosphate"])) addMatch("Kidney-related limits", 20);

  const animalSignals = ["gelatin", "beef", "chicken", "pork", "fish", "anchovy", "milk", "whey", "casein", "egg", "honey"];
  if (profile.dietaryPatterns.includes("vegan") && containsAny(evidence, animalSignals)) addMatch("Vegan preference", 45);
  if (profile.dietaryPatterns.includes("vegetarian") && containsAny(evidence, ["gelatin", "beef", "chicken", "pork", "fish", "anchovy"])) addMatch("Vegetarian preference", 45);
  if ((profile.dietaryPatterns.includes("halal") || profile.dietaryPatterns.includes("kosher")) && containsAny(evidence, ["pork", "lard", "gelatin", "alcohol"])) {
    addMatch(profile.dietaryPatterns.includes("halal") ? "Halal preference" : "Kosher preference", 45);
  }

  if (profile.priorities.includes("minimally_processed") && processing < 70) addMatch("Minimally processed priority", 12);
  if (profile.priorities.includes("short_list") && ingredients.length > 12) addMatch("Short ingredient list priority", 10);
  if (profile.priorities.includes("low_added_sugar") && containsAny(evidence, sugarSignals)) addMatch("Lower added sugar priority", 12);
  if (profile.priorities.includes("lower_sodium") && containsAny(evidence, ["salt", "sodium"])) addMatch("Lower sodium priority", 10);
  if (profile.priorities.includes("no_artificial_colors") && containsAny(evidence, ["red 40", "yellow 5", "yellow 6", "blue 1", "blue 2", "artificial color", "color added"])) addMatch("No artificial colors priority", 18);
  if (profile.priorities.includes("no_artificial_sweeteners") && containsAny(evidence, ["sucralose", "aspartame", "acesulfame", "saccharin", "neotame"])) addMatch("No artificial sweeteners priority", 18);
  fit = clamp(fit);

  const isPersonalized = hasNutritionPreferences(profile);
  const generalScore = clamp(quality * 0.6 + processing * 0.4);
  // Strictly Score is product quality only. Personal fit is deliberately
  // reported separately so a dietary conflict cannot distort the product's
  // general score.
  const score = generalScore;
  const notAFit = isPersonalized && fit < 60;
  const label = score >= 90
    ? "Excellent match"
    : score >= 75
    ? "Strong match"
    : score >= 55
    ? "Worth a closer look"
    : "Low match";
  const fitLabel = !isPersonalized
    ? "Add your profile"
    : notAFit
    ? "Not a fit for you"
    : fit >= 85
    ? "Good fit for you"
    : "Review for your profile";
  const summary = "Strictly Score reflects ingredient quality and processing. Fit for you is shown separately.";

  return {
    score,
    generalScore,
    fitScore: fit,
    label,
    summary,
    fitLabel,
    notAFit,
    isPersonalized,
    matchedPreferences: matches,
    metrics: [
      {
        key: "quality",
        number: "01",
        title: "Ingredient quality",
        score: quality,
        summary: containsAny(evidence, wholeFoodSignals)
          ? "Recognizable ingredients support the score."
          : "What’s present—and what isn’t.",
        details: qualityFlags.length > 0 ? qualityFlags : [{ ingredient: "No major quality flags", tier: "Positive", impact: "No deduction", explanation: "No high- or moderate-concern ingredient signals were found in the captured label." }],
      },
      {
        key: "processing",
        number: "02",
        title: "Level of processing",
        score: processing,
        summary: processingFlags.length > 0
          ? `${processingFlags.length} processing signal${processingFlags.length === 1 ? "" : "s"} found.`
          : "Closer to whole ingredients than heavy formulation.",
        details: processingFlags.length > 0 ? processingFlags : [{ ingredient: "No major processing flags", tier: "Positive", impact: "No deduction", explanation: "The captured label does not contain the current high-weight processing signals." }],
      },
      {
        key: "fit",
        number: "03",
        title: "Fit for you",
        score: fit,
        summary: !isPersonalized
          ? "Add your sensitivities, values, and priorities."
          : matches.length
          ? `Review: ${matches.slice(0, 2).join(" · ")}`
          : "Fits the preferences you selected.",
        details: matches.length > 0
          ? matches.map((match) => ({ ingredient: match, tier: "Profile", impact: "Fit deduction", explanation: "This profile preference or sensitivity matched the captured ingredient evidence." }))
          : [{ ingredient: "No profile conflicts", tier: "Positive", impact: "No deduction", explanation: isPersonalized ? "No selected sensitivities, conditions, dietary patterns, or priorities matched the captured label." : "Add sensitivities, conditions, or priorities to personalize this metric." }],
      },
    ],
  };
};

export const describeProfile = (profile: NutritionProfile) => [
  ...labelsFor(profile.sensitivities, SENSITIVITY_OPTIONS),
  ...labelsFor(profile.conditions, CONDITION_OPTIONS),
  ...labelsFor(profile.dietaryPatterns, DIETARY_PATTERN_OPTIONS),
  ...labelsFor(profile.priorities, PRIORITY_OPTIONS),
];
