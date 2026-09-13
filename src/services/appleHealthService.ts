import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, NativeModules, Platform } from "react-native";
import type { ActivityType } from "../types/fuel";
import { localDayBounds, selectTodayWorkouts } from "../logic/healthWorkouts";

export type HealthWorkout = {
  id: string;
  activityType: ActivityType;
  activityLabel: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  distanceKm?: number;
  activeCalories?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  sourceName?: string;
};

const HEALTH_CONNECTED_KEY = "strictlyfuel:apple-health-connected:v1";

export type AppleHealthState = "unavailable" | "permission_required" | "connected" | "limited" | "error";
export type AppleHealthConnection = { state: AppleHealthState; detail: string; workoutsVisible: boolean };

type StrictlyHealthKitModule = {
  isAvailable: () => Promise<boolean>;
  requestAuthorization: () => Promise<boolean>;
  // Optional so an over-the-air JavaScript update remains compatible with an
  // older installed native build until the user installs the next app build.
  getAuthorizationRequestStatus?: () => Promise<"should_request" | "unnecessary" | "unknown">;
  getRecentWorkouts: (limit: number) => Promise<HealthWorkout[]>;
  getWorkoutsBetween?: (startIso: string, endIso: string, limit: number) => Promise<HealthWorkout[]>;
};

const healthKit = NativeModules.StrictlyHealthKit as StrictlyHealthKitModule | undefined;

export const appleHealthSupported = () => Platform.OS === "ios" && Boolean(healthKit);

export { localDayBounds, selectTodayWorkouts } from "../logic/healthWorkouts";

export async function connectAppleHealth() {
  if (!appleHealthSupported()) throw new Error("Apple Health is available in the iOS device build after it is rebuilt.");
  if (!(await healthKit!.isAvailable())) throw new Error("Health data is not available on this device.");
  const connected = await healthKit!.requestAuthorization();
  if (connected) await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, "true");
  return connected;
}

export async function isAppleHealthConnected() {
  const { state } = await getAppleHealthConnection();
  return state === "connected" || state === "limited";
}

export async function getAppleHealthConnection(): Promise<AppleHealthConnection> {
  if (!appleHealthSupported() || !(await healthKit!.isAvailable())) return { state: "unavailable", detail: "Apple Health is not available on this device.", workoutsVisible: false };
  try {
    const requested = (await AsyncStorage.getItem(HEALTH_CONNECTED_KEY)) === "true";
    const requestStatus = healthKit!.getAuthorizationRequestStatus
      ? await healthKit!.getAuthorizationRequestStatus()
      : requested ? "unnecessary" : "unknown";
    if (!requested && requestStatus === "should_request") return { state: "permission_required", detail: "Choose which workout data Strictly can read.", workoutsVisible: false };
    const workouts = await healthKit!.getRecentWorkouts(1);
    if (workouts.length) return { state: "connected", detail: "Workout data is available to Strictly.", workoutsVisible: true };
    if (!requested && requestStatus === "unknown") return { state: "permission_required", detail: "Connect Apple Health to share your completed workouts.", workoutsVisible: false };
    return { state: "limited", detail: "Connected, but no shared workouts are visible. Review workout access in Health if you expected to see one.", workoutsVisible: false };
  } catch (error) {
    return { state: "error", detail: error instanceof Error ? error.message : "Apple Health could not be read.", workoutsVisible: false };
  }
}

export async function loadRecentHealthWorkouts(limit = 30) {
  if (!appleHealthSupported()) return [];
  return healthKit!.getRecentWorkouts(Math.max(1, Math.min(100, Math.round(limit))));
}

export async function loadTodayHealthWorkouts(now = new Date(), limit = 50) {
  if (!appleHealthSupported()) return [];
  const { start, end } = localDayBounds(now);
  const boundedLimit = Math.max(1, Math.min(100, limit));
  const workouts = healthKit!.getWorkoutsBetween
    ? await healthKit!.getWorkoutsBetween(start.toISOString(), end.toISOString(), boundedLimit)
    : await healthKit!.getRecentWorkouts(Math.max(50, boundedLimit));
  return selectTodayWorkouts(workouts, now);
}

export function refreshHealthWhenAppBecomesActive(refresh: () => void | Promise<void>) {
  return AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
}
