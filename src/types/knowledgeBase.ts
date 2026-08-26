export type KnowledgeReviewStatus = "pending" | "published" | "rejected" | "needs_review";
export type EvidenceStrength = "regulatory" | "clinical" | "systematic_review" | "observational" | "limited" | "unknown";
export type KnowledgeTopic = "allergy" | "celiac" | "blood_sugar" | "blood_pressure" | "ibs" | "kidney" | "processing" | "dietary_pattern" | "general";

export type DataSource = {
  id: string;
  name: string;
  publisher: string;
  url: string;
  license?: string;
  licenseUrl?: string;
  sourceType: "regulatory" | "government" | "research" | "open_dataset" | "product_catalog";
  updatedAt?: string;
};

export type IngredientEntity = {
  id: string;
  canonicalName: string;
  normalizedName: string;
  aliases: string[];
  functionalClass?: string[];
  allergenTags?: string[];
  dietaryTags?: string[];
  sourceIds: string[];
  reviewStatus: KnowledgeReviewStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type EvidenceClaim = {
  id: string;
  ingredientId: string;
  topic: KnowledgeTopic;
  claim: string;
  interpretation: "conflict" | "context" | "neutral";
  strength: EvidenceStrength;
  sourceId: string;
  sourceUrl: string;
  sourceQuote?: string;
  population?: string;
  doseOrContext?: string;
  reviewStatus: KnowledgeReviewStatus;
  reviewedAt?: unknown;
  updatedAt?: unknown;
};

export type ProductKnowledge = {
  id: string;
  barcode?: string;
  productName?: string;
  brand?: string;
  rawIngredients: string;
  ingredientIds: string[];
  ingredientNames: string[];
  source: "user_scan" | "open_food_facts" | "manufacturer" | "manual";
  reviewStatus: KnowledgeReviewStatus;
  knowledgeVersion: number;
  updatedAt?: unknown;
};

export type CurationJob = {
  id: string;
  type: "product_ingest" | "ingredient_enrichment";
  status: "pending" | "running" | "complete" | "failed";
  requestedBy?: string;
  scanId?: string;
  productId?: string;
  ingredientNames?: string[];
  error?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};
