import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as firebaseFunctions } from "../firebaseConfig";
import { EvidenceClaim, IngredientEntity, ProductKnowledge } from "../types/knowledgeBase";

export const normalizeIngredientName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getProductKnowledge = async (productId: string): Promise<ProductKnowledge | null> => {
  const snapshot = await getDoc(doc(db, "productKnowledge", productId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as ProductKnowledge) : null;
};

export const getIngredientByName = async (name: string): Promise<IngredientEntity | null> => {
  const normalizedName = normalizeIngredientName(name);
  if (!normalizedName) return null;
  const aliasSnapshot = await getDocs(
    query(collection(db, "ingredientAliases"), where("normalizedName", "==", normalizedName), limit(1))
  );
  const ingredientId = aliasSnapshot.docs[0]?.data()?.ingredientId;
  if (ingredientId) {
    const entity = await getDoc(doc(db, "ingredientEntities", ingredientId));
    return entity.exists() ? ({ id: entity.id, ...entity.data() } as IngredientEntity) : null;
  }
  const entitySnapshot = await getDocs(
    query(collection(db, "ingredientEntities"), where("normalizedName", "==", normalizedName), limit(1))
  );
  const entity = entitySnapshot.docs[0];
  return entity ? ({ id: entity.id, ...entity.data() } as IngredientEntity) : null;
};

export const getPublishedClaims = async (ingredientId: string): Promise<EvidenceClaim[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, "evidenceClaims"),
      where("ingredientId", "==", ingredientId),
      where("reviewStatus", "==", "published")
    )
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as EvidenceClaim));
};

export const getKnowledgeCoverage = async (ingredientNames: string[]) => {
  const names = [...new Set(ingredientNames.map(normalizeIngredientName).filter(Boolean))].slice(0, 12);
  const entities = (await Promise.all(names.map((name) => getIngredientByName(name)))).filter(Boolean) as IngredientEntity[];
  const claimGroups = await Promise.all(entities.map((entity) => getPublishedClaims(entity.id).catch(() => [])));
  return {
    matchedEntities: entities.length,
    publishedClaims: claimGroups.reduce((total, claims) => total + claims.length, 0),
  };
};

export const requestKnowledgeCuration = async (input: {
  scanId?: string;
  productId?: string;
  ingredientNames: string[];
}) => {
  const callable = httpsCallable(firebaseFunctions, "requestKnowledgeCuration");
  const result = await callable(input);
  return result.data as { jobId: string; status: string };
};
