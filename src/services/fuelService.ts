import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { FuelMeal, FuelPost, FuelTarget, WorkoutDraft } from "../types/fuel";

const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export async function saveWorkout(userId: string, workout: WorkoutDraft, target: FuelTarget) {
  await setDoc(doc(db, "workouts", workout.id), clean({ ...workout, userId, fuelTarget: target, visibility: "private" }));
}

export async function saveMeal(userId: string, meal: FuelMeal) {
  await setDoc(doc(db, "meals", meal.id), clean({ ...meal, userId, visibility: "private" }));
}

export async function publishFuelPost(post: FuelPost) {
  await setDoc(doc(db, "fuelPosts", post.id), clean({ ...post, isPublic: true }));
}

export async function fetchFuelPosts(activityType?: string): Promise<FuelPost[]> {
  const base = collection(db, "fuelPosts");
  const request = activityType
    ? query(base, where("isPublic", "==", true), where("workout.activityType", "==", activityType), limit(30))
    : query(base, where("isPublic", "==", true), orderBy("createdAt", "desc"), limit(30));
  const snapshot = await getDocs(request);
  return snapshot.docs.map((item) => item.data() as FuelPost);
}

export async function saveCommunityMeal(userId: string, post: FuelPost) {
  await setDoc(doc(db, "users", userId, "savedMeals", post.id), clean({ postId: post.id, post, savedAt: new Date().toISOString() }));
}

export async function removeSavedCommunityMeal(userId: string, postId: string) {
  await deleteDoc(doc(db, "users", userId, "savedMeals", postId));
}

