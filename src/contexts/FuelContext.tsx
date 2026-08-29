import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { calculateFuelTarget } from "../logic/fuelCalculator";
import { calculateMealMacros } from "../logic/nutritionEngine";
import { scoreMeal } from "../logic/mealScore";
import { scaleMealToTarget } from "../logic/mealScaling";
import { DEFAULT_ACTIVITIES } from "../data/activities";
import type { ActivityType, FuelMeal, FuelPost, FuelTarget, MealIngredient, WorkoutDraft } from "../types/fuel";

const STORAGE_KEY = "strictlyfuel:p0-state:v1";
const makeId = (_prefix: string) => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
  const random = Math.floor(Math.random() * 16);
  return (value === "x" ? random : (random & 0x3) | 0x8).toString(16);
});

type WorkoutInput = Omit<WorkoutDraft, "id" | "createdAt">;

type FuelContextValue = {
  hydrated: boolean;
  workout: WorkoutDraft | null;
  target: FuelTarget | null;
  ingredients: MealIngredient[];
  meals: FuelMeal[];
  savedPostIds: string[];
  localPosts: FuelPost[];
  recentActivities: ActivityType[];
  favoriteActivities: ActivityType[];
  createWorkout: (input: WorkoutInput) => { workout: WorkoutDraft; target: FuelTarget };
  setIngredients: React.Dispatch<React.SetStateAction<MealIngredient[]>>;
  addIngredient: (ingredient: Omit<MealIngredient, "id">) => void;
  updateIngredient: (id: string, changes: Partial<Pick<MealIngredient, "grams" | "food">>) => void;
  removeIngredient: (id: string) => void;
  clearMeal: () => void;
  buildMeal: (userId: string, name: string, source?: FuelMeal["source"], options?: { imageUri?: string; confidence?: number; isEstimate?: boolean; ingredients?: MealIngredient[] }) => FuelMeal | null;
  importPostMeal: (post: FuelPost) => void;
  toggleSavedPost: (postId: string) => void;
  addLocalPost: (post: FuelPost) => void;
  toggleFavoriteActivity: (activity: ActivityType) => void;
};

const FuelContext = createContext<FuelContextValue | undefined>(undefined);

export function FuelProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [workout, setWorkout] = useState<WorkoutDraft | null>(null);
  const [target, setTarget] = useState<FuelTarget | null>(null);
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [meals, setMeals] = useState<FuelMeal[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [localPosts, setLocalPosts] = useState<FuelPost[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityType[]>([]);
  const [favoriteActivities, setFavoriteActivities] = useState<ActivityType[]>(DEFAULT_ACTIVITIES);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const state = JSON.parse(raw);
        setWorkout(state.workout || null);
        setTarget(state.target || null);
        setIngredients(state.ingredients || []);
        setMeals(state.meals || []);
        setSavedPostIds(state.savedPostIds || []);
        setLocalPosts(state.localPosts || []);
        setRecentActivities(state.recentActivities || []);
        setFavoriteActivities(state.favoriteActivities?.length ? state.favoriteActivities : DEFAULT_ACTIVITIES);
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ workout, target, ingredients, meals, savedPostIds, localPosts, recentActivities, favoriteActivities })).catch(() => undefined);
  }, [hydrated, workout, target, ingredients, meals, savedPostIds, localPosts, recentActivities, favoriteActivities]);

  const createWorkout = useCallback((input: WorkoutInput) => {
    const nextWorkout: WorkoutDraft = { ...input, id: makeId("workout"), createdAt: new Date().toISOString() };
    const nextTarget = calculateFuelTarget(nextWorkout);
    setWorkout(nextWorkout);
    setTarget(nextTarget);
    setIngredients([]);
    setRecentActivities((current) => [input.activityType, ...current.filter((activity) => activity !== input.activityType)].slice(0, 8));
    return { workout: nextWorkout, target: nextTarget };
  }, []);

  const addIngredient = useCallback((ingredient: Omit<MealIngredient, "id">) => {
    setIngredients((current) => [...current, { ...ingredient, id: makeId("ingredient") }]);
  }, []);

  const updateIngredient = useCallback((id: string, changes: Partial<Pick<MealIngredient, "grams" | "food">>) => {
    setIngredients((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setIngredients((current) => current.filter((item) => item.id !== id));
  }, []);

  const buildMeal = useCallback((userId: string, name: string, source: FuelMeal["source"] = "manual", options?: { imageUri?: string; confidence?: number; isEstimate?: boolean; ingredients?: MealIngredient[] }) => {
    const mealIngredients = options?.ingredients || ingredients;
    if (!workout || !target || !mealIngredients.length) return null;
    const macros = calculateMealMacros(mealIngredients);
    const meal: FuelMeal = {
      id: makeId("meal"),
      userId,
      workoutId: workout.id,
      name: name.trim() || "Pre-workout meal",
      imageUri: options?.imageUri,
      ingredients: mealIngredients,
      macros,
      score: scoreMeal(macros, target, workout),
      source,
      confidence: options?.confidence,
      isEstimate: options?.isEstimate ?? mealIngredients.some((item) => item.estimated),
      createdAt: new Date().toISOString(),
    };
    setMeals((current) => [meal, ...current.filter((item) => item.id !== meal.id)]);
    return meal;
  }, [ingredients, target, workout]);

  const importPostMeal = useCallback((post: FuelPost) => {
    if (!target) return;
    setIngredients(scaleMealToTarget(post.meal.ingredients, target));
  }, [target]);

  const value = useMemo<FuelContextValue>(() => ({
    hydrated,
    workout,
    target,
    ingredients,
    meals,
    savedPostIds,
    localPosts,
    recentActivities,
    favoriteActivities,
    createWorkout,
    setIngredients,
    addIngredient,
    updateIngredient,
    removeIngredient,
    clearMeal: () => setIngredients([]),
    buildMeal,
    importPostMeal,
    toggleSavedPost: (postId) => setSavedPostIds((current) => current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId]),
    addLocalPost: (post) => setLocalPosts((current) => [post, ...current]),
    toggleFavoriteActivity: (activity) => setFavoriteActivities((current) => current.includes(activity) ? current.filter((item) => item !== activity) : [...current, activity].slice(-8)),
  }), [hydrated, workout, target, ingredients, meals, savedPostIds, localPosts, recentActivities, favoriteActivities, createWorkout, addIngredient, updateIngredient, removeIngredient, buildMeal, importPostMeal]);

  return <FuelContext.Provider value={value}>{children}</FuelContext.Provider>;
}

export function useFuel() {
  const context = useContext(FuelContext);
  if (!context) throw new Error("useFuel must be used inside FuelProvider");
  return context;
}
