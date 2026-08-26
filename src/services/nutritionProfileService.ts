import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EMPTY_NUTRITION_PROFILE,
  NutritionProfile,
} from "../types/nutritionProfile";

const PROFILE_KEY = "strictly:nutrition-profile:v1";

export const loadNutritionProfile = async (): Promise<NutritionProfile> => {
  try {
    const value = await AsyncStorage.getItem(PROFILE_KEY);
    if (!value) return { ...EMPTY_NUTRITION_PROFILE };
    const stored = JSON.parse(value) as Partial<NutritionProfile>;
    return {
      sensitivities: stored.sensitivities || [],
      conditions: stored.conditions || [],
      dietaryPatterns: stored.dietaryPatterns || [],
      priorities: stored.priorities || [],
      updatedAt: stored.updatedAt || "",
    };
  } catch {
    return { ...EMPTY_NUTRITION_PROFILE };
  }
};

export const saveNutritionProfile = async (
  profile: NutritionProfile
): Promise<NutritionProfile> => {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
};
