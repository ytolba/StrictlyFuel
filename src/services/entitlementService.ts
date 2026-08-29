import AsyncStorage from "@react-native-async-storage/async-storage";
import { RESHUFFLE_LIMITS, SCAN_LIMITS } from "../config/monetization";

/** Metered features. Each gets its own weekly bucket. */
export type MeteredFeature = "scan" | "reshuffle";

const STORAGE_KEY = (feature: MeteredFeature) => `strictlyfuel:usage:${feature}:v1`;

export type WeeklyUsage = {
  /** ISO week bucket, e.g. "2026-W35". */
  weekKey: string;
  count: number;
};

/**
 * ISO-8601 week key. Weeks start Monday, which is what the in-app copy
 * promises ("resets Monday"), so the maths and the wording cannot drift apart.
 */
export function weekKeyFor(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNumber + 3); // Thursday decides the ISO year
  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Milliseconds until the allowance rolls over (next Monday, local time). */
export function msUntilWeeklyReset(now: Date = new Date()): number {
  const next = new Date(now);
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export const limitFor = (feature: MeteredFeature, isPro: boolean) => {
  const table = feature === "scan" ? SCAN_LIMITS : RESHUFFLE_LIMITS;
  return isPro ? table.pro : table.free;
};

export async function loadUsage(feature: MeteredFeature): Promise<WeeklyUsage> {
  const currentWeek = weekKeyFor();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY(feature));
    if (!raw) return { weekKey: currentWeek, count: 0 };
    const stored = JSON.parse(raw) as Partial<WeeklyUsage>;
    // A stale bucket means the week rolled over; the allowance is fresh.
    if (stored.weekKey !== currentWeek) return { weekKey: currentWeek, count: 0 };
    return { weekKey: currentWeek, count: Math.max(0, Number(stored.count) || 0) };
  } catch {
    return { weekKey: currentWeek, count: 0 };
  }
}

export async function recordUse(feature: MeteredFeature): Promise<WeeklyUsage> {
  const usage = await loadUsage(feature);
  const next: WeeklyUsage = { weekKey: usage.weekKey, count: usage.count + 1 };
  try {
    await AsyncStorage.setItem(STORAGE_KEY(feature), JSON.stringify(next));
  } catch {
    // Usage tracking is best-effort; never block the user on storage failure.
  }
  return next;
}

/**
 * Overwrite the local counter with an authoritative server count.
 *
 * The server ledger is the real gate; this local mirror only exists so the UI
 * can show a number instantly and while offline.
 */
export async function setUsage(feature: MeteredFeature, count: number): Promise<WeeklyUsage> {
  const next: WeeklyUsage = { weekKey: weekKeyFor(), count: Math.max(0, Math.round(count)) };
  try {
    await AsyncStorage.setItem(STORAGE_KEY(feature), JSON.stringify(next));
  } catch {
    // Best-effort mirror.
  }
  return next;
}

/** Test/support hook — clears a local allowance. */
export async function resetUsage(feature: MeteredFeature): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY(feature));
  } catch {
    // ignore
  }
}
