import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EMPTY_NUTRITION_PROFILE,
  NutritionProfile,
} from "../types/nutritionProfile";
import { supabase } from "../lib/supabase";

const PROFILE_KEY = "strictly:nutrition-profile:v1";

export const loadNutritionProfile = async (): Promise<NutritionProfile> => {
  try {
    const value = await AsyncStorage.getItem(PROFILE_KEY);
    const stored = value ? JSON.parse(value) as Partial<NutritionProfile> : {};
    let profile: NutritionProfile = {
      sensitivities: stored.sensitivities || [],
      conditions: stored.conditions || [],
      dietaryPatterns: stored.dietaryPatterns || [],
      priorities: stored.priorities || [],
      measurementSystem: stored.measurementSystem || "imperial",
      bodyWeightKg: stored.bodyWeightKg || null,
      heightCm: stored.heightCm || null,
      healthInsightsEnabled: stored.healthInsightsEnabled === true,
      updatedAt: stored.updatedAt || "",
    };
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user && !auth.user.is_anonymous) {
      const { data: remote } = await supabase.from("user_fuel_preferences").select("body_weight_kg,height_cm,units,health_insights_enabled,sensitivities,allergies,dietary_patterns,avoid_foods,updated_at").eq("user_id", auth.user.id).maybeSingle();
      if (remote) profile = {
        sensitivities: remote.sensitivities || profile.sensitivities,
        conditions: remote.allergies || profile.conditions,
        dietaryPatterns: remote.dietary_patterns || profile.dietaryPatterns,
        priorities: remote.avoid_foods || profile.priorities,
        measurementSystem: remote.units || profile.measurementSystem,
        bodyWeightKg: Number(remote.body_weight_kg) || profile.bodyWeightKg,
        heightCm: Number(remote.height_cm) || profile.heightCm,
        healthInsightsEnabled: remote.health_insights_enabled === true,
        updatedAt: remote.updated_at || profile.updatedAt,
      };
    }
    return profile;
  } catch {
    return { ...EMPTY_NUTRITION_PROFILE };
  }
};

export const saveNutritionProfile = async (
  profile: NutritionProfile
): Promise<NutritionProfile> => {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  const { data } = await supabase.auth.getUser();
  if (data.user && !data.user.is_anonymous) {
    await supabase.from("user_fuel_preferences").upsert({
      user_id: data.user.id,
      body_weight_kg: next.bodyWeightKg,
      height_cm: next.heightCm,
      units: next.measurementSystem,
      health_insights_enabled: next.healthInsightsEnabled,
      sensitivities: next.sensitivities,
      allergies: next.conditions,
      dietary_patterns: next.dietaryPatterns,
      avoid_foods: next.priorities,
      updated_at: new Date().toISOString(),
    });
  }
  return next;
};
