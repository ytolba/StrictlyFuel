// src/services/scanService.ts

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { ScanHistoryItem } from "../types/scan";

export type IngredientScanCache = {
  id: string;
  ingredients: string[];
  rawText: string;
  details: string;
  category?: string;
  productName?: string;
  unknown?: boolean;
  updatedAt?: Timestamp;
};

const normalizeIngredient = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/** Stable, privacy-safe document key for an ordered ingredient list. */
export const ingredientFingerprint = (ingredients: string[]) => {
  const input = ingredients.map(normalizeIngredient).filter(Boolean).join("|");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v1_${(hash >>> 0).toString(16)}`;
};

export const getIngredientScanCache = async (ingredients: string[]): Promise<IngredientScanCache | null> => {
  if (!ingredients.length) return null;
  const cacheDoc = await getDoc(doc(db, "ingredientScanCache", ingredientFingerprint(ingredients)));
  if (!cacheDoc.exists()) return null;
  const data = cacheDoc.data();
  return { id: cacheDoc.id, ...data, ingredients: Array.isArray(data.ingredients) ? data.ingredients : [] } as IngredientScanCache;
};

export const saveIngredientScanCache = async (cache: Omit<IngredientScanCache, "id" | "updatedAt">) => {
  const id = ingredientFingerprint(cache.ingredients);
  await setDoc(doc(db, "ingredientScanCache", id), {
    ...cache,
    id,
    updatedAt: Timestamp.now(),
  }, { merge: true });
  return id;
};

export const saveScanToHistory = async (
  userId: string,
  ingredients: string[],
  imageUrl: string, // Changed from imageUri to imageUrl
  isBased: boolean,
  rawText: string,
  unknown: boolean,
  productName?: string,
  stringDetails?: string,
  metadata?: { category?: string; brand?: string; barcode?: string }
 
): Promise<string> => {
  try {
    console.log("Saving scan for user:", userId);

    // Create scan history item with Firebase URL
    const scanItem = {
      userId,
      timestamp: Timestamp.now(),
      ingredients,
      imageUrl,
      isBased,
      unknown,
      productName: productName || "Unknown Product",
      category: metadata?.category || "",
      brand: metadata?.brand || "",
      barcode: metadata?.barcode || "",
      rawText,
      stringDetails,
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, "scans"), scanItem);
    console.log("Scan saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving scan:", error);
    throw new Error(`Failed to save scan: ${error}`);
  }
};

export const getUserScans = async (
  userId: string
): Promise<ScanHistoryItem[]> => {
  try {
    console.log("Fetching scans for user:", userId);
    const scansRef = collection(db, "scans");
    const q = query(
      scansRef,
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    console.log("Found scans:", querySnapshot.size);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        imageUrl: data.imageUrl || "", // Handle missing imageUrl
        ingredients: data.ingredients || [],
        isBased: data.isBased || false,
        unknown: data.unknown || false,
        rawText: data.rawText || "",
        productName: data.productName || "Unknown Product",
        category: data.category || "",
        brand: data.brand || "",
        barcode: data.barcode || "",
        timestamp: data.timestamp instanceof Timestamp 
          ? data.timestamp.toMillis() 
          : new Date(data.timestamp).getTime(),
        stringDetails: data.stringDetails || "",
      } as ScanHistoryItem;
    });
  } catch (error) {
    console.error("Error fetching scans:", error);
    throw new Error(`Failed to fetch scans: ${error}`);
  }
};
export const getScanById = async (id: string): Promise<ScanHistoryItem | null> => {
  try {
    console.log("Fetching scan with ID:", id);

    // Reference to the specific scan document
    const scanRef = doc(db, "scans", id);

    // Fetch the document
    const scanDoc = await getDoc(scanRef);

    if (scanDoc.exists()) {
      const data = scanDoc.data();
      console.log("Found scan:", data);

      // Map Firestore data to ScanHistoryItem
      return {
        id: scanDoc.id,
        imageUrl: data.imageUrl || "", // Handle missing imageUrl
        ingredients: data.ingredients || [],
        isBased: data.isBased || false,
        unknown: data.unknown || false,
        rawText: data.rawText || "",
        productName: data.productName || "Unknown Product",
        category: data.category || "",
        brand: data.brand || "",
        barcode: data.barcode || "",
        timestamp: data.timestamp instanceof Timestamp 
          ? data.timestamp.toMillis() 
          : new Date(data.timestamp).getTime(),
        stringDetails: data.stringDetails || "",
      } as ScanHistoryItem;
    } else {
      console.log("No scan found with ID:", id);
      return null; // Return null if the scan doesn't exist
    }
  } catch (error) {
    console.error("Error fetching scan:", error);
    throw new Error(`Failed to fetch scan: ${error}`);
  }
};
export const deleteScan = async (userId: string, scanId: string) => {
  try {
    const scanRef = doc(db, "scans", scanId);
    await deleteDoc(scanRef);
  } catch (error) {
    throw new Error("Failed to delete scan: " + error.message);
  }
};
