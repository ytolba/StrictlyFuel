// src/firebaseConfig.ts

import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from "@env";
// Firebase configuration
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: "G-QYFWK2D1L8",
};
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app, "gs://basedcart-c3c41.firebasestorage.app");
const functions = getFunctions(app);

// Export Firebase functions
export const paymentSheet = httpsCallable(functions, "paymentSheet");
export const createSubscription = httpsCallable(
  functions,
  "createSubscription"
);
export const checkScanLimit = httpsCallable(functions, "checkScanLimit");

import { Product } from "../types";

export const storeBasedProduct = async (product: Product) => {
  // Store product in Firestore
};

export const getBasedProducts = async (
  category: string
): Promise<Product[]> => {
  // Fetch products by category from Firestore
  return products;
};

export { auth, db, storage, functions };
export default app;
