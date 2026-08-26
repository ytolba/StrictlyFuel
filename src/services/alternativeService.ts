import axios from "axios";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db } from "../firebaseConfig";
import { functions as firebaseFunctions } from "../firebaseConfig";
import { loadNutritionProfile } from "./nutritionProfileService";
import { scoreIngredients, NutritionScore } from "../utils/nutritionScore";

const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "brands",
  "image_front_small_url",
  "image_url",
  "ingredients_text",
  "ingredients_text_en",
  "ingredients",
  "categories",
  "categories_tags_en",
].join(",");

export type AlternativeProduct = {
  code: string;
  productName: string;
  brand?: string;
  imageUrl?: string;
  category: string;
  score: NutritionScore;
  reason: string;
  productUrl: string;
  source?: "curated" | "openfoodfacts" | "web";
  sourceUrl?: string;
  verifiedAt?: string;
  catalogScore?: number;
};

type AlternativeSearchInput = {
  ingredients: string[];
  details?: string;
  category?: string;
  productName?: string;
  barcode?: string;
  currentScore?: number | null;
};

type WebAlternativeResponse = {
  alternatives?: Array<{
    productName: string;
    brand?: string;
    ingredients: string[];
    estimatedScore: number;
    reason: string;
    sourceUrl: string;
    sourceTitle?: string;
  }>;
  searchedAt?: string;
};

const userAgent = "Strictly/1.0 (app; contact@strictlybased.com)";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const slugifyCategory = (category: string) => {
  const normalized = normalize(category)
    .replace(/\b(en|us|usa)\b/g, " ")
    .replace(/\bproducts?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.replace(/\s/g, "-") : "";
};

const categoryTokens = (category: string) =>
  normalize(category)
    .split(" ")
    .filter((token) => token.length > 2 && !["food", "products", "product"].includes(token));

const parseIngredients = (product: any): string[] => {
  if (Array.isArray(product.ingredients)) {
    const names = product.ingredients
      .map((item: any) => item?.text || item?.id || "")
      .filter(Boolean);
    if (names.length > 0) return names;
  }

  const text = product.ingredients_text_en || product.ingredients_text || "";
  return text
    .split(/[,;•]/)
    .map((item: string) => item.replace(/^\s*\d+[.)-]?\s*/, "").trim())
    .filter((item: string) => item.length > 1);
};

const productCategories = (product: any): string[] => {
  const fromTags = Array.isArray(product.categories_tags_en) ? product.categories_tags_en : [];
  const fromText = typeof product.categories === "string" ? product.categories.split(",") : [];
  return [...fromTags, ...fromText].map((item) => normalize(String(item))).filter(Boolean);
};

const isSameCategory = (product: any, sourceTokens: string[]) => {
  if (sourceTokens.length === 0) return false;
  const candidateCategories = productCategories(product).join(" ");
  return sourceTokens.some((token) => candidateCategories.includes(token));
};

const buildReason = (score: NutritionScore) => {
  if (score.notAFit) return "Higher overall score, but still review your profile flags.";
  if (score.matchedPreferences.length > 0) {
    return `Higher score with ${score.matchedPreferences.slice(0, 1).join("")} to review.`;
  }
  return "Higher Strictly score for this category.";
};

const extractProducts = (payload: any): any[] => {
  if (Array.isArray(payload?.products)) return payload.products;
  if (payload?.product) return [payload.product];
  return [];
};

const getCuratedAlternatives = async (
  sourceTokens: string[],
  barcode: string,
  profile: Awaited<ReturnType<typeof loadNutritionProfile>>
): Promise<AlternativeProduct[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "curatedAlternatives"),
        where("status", "==", "published"),
        limit(100)
      )
    );

    return snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }) as any)
      .filter((product) => {
        const code = String(product.code || product.id || "");
        const categoryTokens = [
          ...(Array.isArray(product.categoryKeys) ? product.categoryKeys : []),
          product.category || "",
        ].flatMap((value) => categoryTokensForRecord(String(value)));
        return (
          code &&
          code !== barcode &&
          sourceTokens.some((token) => categoryTokens.includes(token))
        );
      })
      .map((product) => {
        const candidateIngredients = Array.isArray(product.ingredients)
          ? product.ingredients.filter(Boolean)
          : parseIngredients(product);
        const score = scoreIngredients({ ingredients: candidateIngredients, profile });
        const code = String(product.code || product.id);
        return {
          code,
          productName: product.productName || product.product_name || "Unnamed product",
          brand: product.brand || undefined,
          imageUrl: product.imageUrl || undefined,
          category: product.category || "",
          score,
          reason: product.reason || buildReason(score),
          productUrl: product.productUrl || product.sourceUrl || "",
          source: "curated",
          sourceUrl: product.sourceUrl || product.productUrl || undefined,
          verifiedAt: product.verifiedAt || undefined,
          catalogScore: typeof product.catalogScore === "number" ? product.catalogScore : undefined,
        } as AlternativeProduct;
      })
      .filter(
        (product) =>
          product.score.score !== null &&
          product.score.score >= 85
      );
  } catch {
    // A catalog read must never prevent the public Open Food Facts fallback.
    return [];
  }
};

const categoryTokensForRecord = (value: string) =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !["food", "foods", "product", "products"].includes(token));

/**
 * Finds comparable products from Open Food Facts and scores them with the
 * user's existing Strictly profile. This intentionally returns no results
 * when a scan has no reliable category instead of guessing across categories.
 */
export const findBetterAlternatives = async ({
  ingredients,
  details = "",
  category = "",
  productName = "",
  barcode = "",
  currentScore = null,
}: AlternativeSearchInput): Promise<AlternativeProduct[]> => {
  const categorySlug = slugifyCategory(category);
  const sourceTokens = categoryTokens(category);
  if (!categorySlug || sourceTokens.length === 0) return [];

  const profile = await loadNutritionProfile();
  const sourceScore = currentScore ?? scoreIngredients({ ingredients, details, profile }).score;
  const minimumScore = Math.min(92, Math.max(70, (sourceScore ?? 0) + 5));
  const curatedAlternatives = await getCuratedAlternatives(sourceTokens, barcode, profile);

  const headers = { "User-Agent": userAgent };
  const requests: Promise<any>[] = [
    axios.get("https://world.openfoodfacts.org/api/v2/search", {
      params: {
        categories_tags_en: categorySlug,
        page_size: 30,
        sort_by: "unique_scans_n",
        fields: OFF_FIELDS,
      },
      headers,
      timeout: 9000,
    }),
  ];

  const searchTerm = productName.trim() || sourceTokens.slice(0, 2).join(" ");
  if (searchTerm) {
    requests.push(
      axios.get("https://world.openfoodfacts.org/cgi/search.pl", {
        params: {
          search_terms: searchTerm,
          search_simple: 1,
          action: "process",
          json: 1,
          page_size: 20,
          sort_by: "unique_scans_n",
          fields: OFF_FIELDS,
        },
        headers,
        timeout: 9000,
      })
    );
  }

  const responses = await Promise.allSettled(requests);
  const candidates = responses.flatMap((result) =>
    result.status === "fulfilled" ? extractProducts(result.value.data) : []
  );
  const seen = new Set<string>();

  const openFoodFactsAlternatives = candidates
    .filter((product) => {
      const code = String(product.code || product._id || "");
      if (!code || code === barcode || seen.has(code) || !isSameCategory(product, sourceTokens)) return false;
      seen.add(code);
      return true;
    })
    .map((product) => {
      const candidateIngredients = parseIngredients(product);
      if (candidateIngredients.length === 0) return null;
      const score = scoreIngredients({ ingredients: candidateIngredients, profile });
      const code = String(product.code || product._id);
      return {
        code,
        productName: product.product_name_en || product.product_name || "Unnamed product",
        brand: product.brands?.split(",")[0]?.trim() || undefined,
        imageUrl: product.image_front_small_url || product.image_url || undefined,
        category: product.categories || category,
        score,
        reason: buildReason(score),
        productUrl: `https://world.openfoodfacts.org/product/${code}`,
      } as AlternativeProduct;
    })
    .filter((product): product is AlternativeProduct => product !== null && product.score.score !== null && product.score.score >= minimumScore)
    .sort((a, b) => (b.score.score || 0) - (a.score.score || 0))
    .slice(0, 6);

  const seenCodes = new Set<string>();
  return [...curatedAlternatives, ...openFoodFactsAlternatives]
    .filter((product) => {
      if (seenCodes.has(product.code)) return false;
      seenCodes.add(product.code);
      return true;
    })
    .sort((a, b) => (b.score.score || 0) - (a.score.score || 0))
    .slice(0, 6);
};

/** Search the web on demand when Firestore/Open Food Facts has no strong match. */
export const searchWebAlternatives = async ({
  ingredients,
  category = "",
  productName = "",
}: Pick<AlternativeSearchInput, "ingredients" | "category" | "productName">): Promise<AlternativeProduct[]> => {
  const callable = httpsCallable(firebaseFunctions, "searchWebAlternatives");
  const response = await callable({ ingredients, category, productName });
  const payload = response.data as WebAlternativeResponse;
  const profile = await loadNutritionProfile();
  return (payload.alternatives || []).map((item, index) => {
    const score = scoreIngredients({ ingredients: item.ingredients, profile });
    return {
      code: `web-${index}-${item.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
      productName: item.productName,
      brand: item.brand || undefined,
      category: category || "",
      score,
      reason: item.reason || "Web-researched cleaner match for this category.",
      productUrl: item.sourceUrl,
      sourceUrl: item.sourceUrl,
      source: "web",
      verifiedAt: payload.searchedAt,
      catalogScore: typeof item.estimatedScore === "number" ? item.estimatedScore : undefined,
    } as AlternativeProduct;
  }).filter((item) => item.score.score !== null && item.score.score >= 90);
};
