import { NativeModules, Platform } from "react-native";
import type { ActivityType } from "../types/fuel";

export type HealthWorkout = {
  id: string;
  activityType: ActivityType;
  activityLabel: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  distanceKm?: number;
  activeCalories?: number;
  sourceName?: string;
};

type StrictlyHealthKitModule = {
  isAvailable: () => Promise<boolean>;
  requestAuthorization: () => Promise<boolean>;
  getRecentWorkouts: (limit: number) => Promise<HealthWorkout[]>;
};

const healthKit = NativeModules.StrictlyHealthKit as StrictlyHealthKitModule | undefined;

export const appleHealthSupported = () => Platform.OS === "ios" && Boolean(healthKit);

export async function connectAppleHealth() {
  if (!appleHealthSupported()) throw new Error("Apple Health is available in the iOS device build after it is rebuilt.");
  if (!(await healthKit!.isAvailable())) throw new Error("Health data is not available on this device.");
  return healthKit!.requestAuthorization();
}

export async function loadRecentHealthWorkouts(limit = 30) {
  if (!appleHealthSupported()) return [];
  return healthKit!.getRecentWorkouts(Math.max(1, Math.min(100, Math.round(limit))));
}
