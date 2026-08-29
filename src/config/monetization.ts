import { Platform } from "react-native";

/**
 * Freemium configuration.
 *
 * AI meal scans are the expensive operation in the app (vision model calls), so
 * they are the metered feature. Everything else — targets, meal building,
 * curated ideas, scores, community — stays free, which keeps the app useful
 * without a subscription and keeps us on the right side of App Store
 * guideline 3.1 (no essential functionality locked behind an unclear paywall).
 */

/* -------------------------------------------------------------------------- */
/* RevenueCat identifiers                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Entitlement identifier configured in RevenueCat → Product catalog →
 * Entitlements. This string must match the dashboard exactly, and it must match
 * `PRO_ENTITLEMENT` in supabase/functions/revenuecat-webhook/index.ts, because
 * the webhook decides who is Pro on the server using the same id.
 */
export const PRO_ENTITLEMENT = "strictlyfuel_pro";

/**
 * Package identifiers inside the offering. RevenueCat's built-in packages use
 * the `$rc_` prefix; a hand-named package uses whatever you typed in the
 * dashboard. We look both up so the app works either way.
 */
export const PACKAGE_IDS = {
  monthly: "monthly",
  yearly: "yearly",
} as const;

/** RevenueCat built-in package identifiers, checked as a fallback. */
export const RC_PACKAGE_IDS = {
  monthly: "$rc_monthly",
  yearly: "$rc_annual",
} as const;

/** App Store Connect product identifiers attached to the packages above. */
export const PRODUCT_IDS = {
  monthly: "strictlyfuel_pro_monthly",
  yearly: "strictlyfuel_pro_yearly",
} as const;

/**
 * Offering to show. `null` means "whatever the dashboard marks as current",
 * which is what you want in production — it lets you swap offerings and run
 * experiments without shipping a build.
 */
export const OFFERING_ID: string | null = null;

/* -------------------------------------------------------------------------- */
/* API keys                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Public SDK keys. These are safe to ship — they are write-only keys scoped to
 * a single app, and RevenueCat expects them to be embedded in the binary. The
 * secret key (`sk_...`) and the webhook secret must never appear here.
 *
 * Keys are read from the environment first so that a build can be pointed at a
 * different RevenueCat project without a code change.
 */
const FALLBACK_APPLE_KEY = "appl_VmOPptSHnlPQZyKexioqRSiPuBX";

export const REVENUECAT_KEYS = {
  apple: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || FALLBACK_APPLE_KEY,
  google: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "",
  /**
   * RevenueCat Test Store key (`test_` prefix). It simulates purchases without
   * App Store Connect, so it is useful on a simulator — but it needs
   * react-native-purchases 9.5.4 or newer and this app is on 8.12.0, so it is
   * inert until that upgrade happens. It must never reach a release build:
   * see `resolveApiKey`, which only ever hands it back in __DEV__.
   */
  test: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY || "",
} as const;

/** Minimum react-native-purchases version that understands `test_` keys. */
export const TEST_STORE_MIN_SDK = "9.5.4";

/**
 * Pick the key for this platform and build.
 *
 * A Test Store key is only ever used in a debug build, and only when it has
 * been explicitly opted into, because shipping one to the App Store would mean
 * every purchase silently succeeds without money changing hands.
 */
export function resolveApiKey(): { apiKey: string; usingTestStore: boolean } {
  const useTestStore = __DEV__ && process.env.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE === "1" && Boolean(REVENUECAT_KEYS.test);

  if (useTestStore) return { apiKey: REVENUECAT_KEYS.test, usingTestStore: true };

  const apiKey = Platform.OS === "ios" ? REVENUECAT_KEYS.apple : REVENUECAT_KEYS.google;
  return { apiKey, usingTestStore: false };
}

/* -------------------------------------------------------------------------- */
/* Limits and paywall copy                                                     */
/* -------------------------------------------------------------------------- */

/** Weekly AI meal-scan allowance. */
export const SCAN_LIMITS = {
  free: 3,
  /**
   * Marketed as unlimited, but capped to protect against runaway cost and
   * automated abuse. A real athlete logging every meal lands nowhere near this.
   */
  pro: 100,
} as const;

/** Weekly AI meal-idea reshuffle allowance. */
export const RESHUFFLE_LIMITS = {
  free: 5,
  pro: 200,
} as const;

/**
 * Render RevenueCat's remotely-configured paywall (Dashboard → Paywalls) rather
 * than the hand-built one. The hand-built paywall stays in the bundle as the
 * fallback for builds without react-native-purchases-ui and for devices where
 * StoreKit is unavailable, so turning this off is always safe.
 */
export const USE_REVENUECAT_PAYWALL = true;

/** Shown on the paywall. Real prices always come from StoreKit at runtime. */
export const PLAN_COPY = {
  trialDays: 3,
  monthly: { price: "$4.99", period: "month", note: "Billed monthly" },
  yearly: { price: "$29.99", period: "year", note: "Billed yearly · save 50%" },
} as const;

export const LEGAL_URLS = {
  terms: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  privacy: "https://strictlyfuel.app/privacy",
} as const;

export const PRO_BENEFITS = [
  { icon: "camera-outline", title: "Unlimited meal scans", text: `${SCAN_LIMITS.pro} AI photo scans a week instead of ${SCAN_LIMITS.free}.` },
  { icon: "shuffle-outline", title: "Unlimited reshuffles", text: `Re-roll meal ideas ${RESHUFFLE_LIMITS.pro} times a week instead of ${RESHUFFLE_LIMITS.free}.` },
  { icon: "flash-outline", title: "No weekly ceiling mid-block", text: "Train twice a day through a hard block without running out of scans." },
  { icon: "heart-outline", title: "Support an independent app", text: "StrictlyFuel has no ads and does not sell your data. Subscriptions are what fund it." },
] as const;
