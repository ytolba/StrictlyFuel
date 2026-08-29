/**
 * Safe access to `react-native-purchases-ui` (RevenueCat Paywalls and Customer
 * Center).
 *
 * The package is a native module, so importing it statically crashes anywhere
 * the native side is missing — Expo Go, the web bundle, a stale dev client
 * built before the dependency was added. Every screen in this app has to keep
 * working in those environments, so the module is required lazily and a null
 * result simply means "fall back to the hand-built UI".
 */

export type PaywallResult = "NOT_PRESENTED" | "ERROR" | "CANCELLED" | "PURCHASED" | "RESTORED";

/** Results that mean the customer should now have their entitlement. */
export const PAYWALL_SUCCESS: PaywallResult[] = ["PURCHASED", "RESTORED"];

type RevenueCatUIModule = {
  presentPaywall: (params?: Record<string, unknown>) => Promise<PaywallResult>;
  presentPaywallIfNeeded: (params: Record<string, unknown>) => Promise<PaywallResult>;
  presentCustomerCenter: (params?: Record<string, unknown>) => Promise<void>;
  Paywall: React.ComponentType<any>;
};

let cached: RevenueCatUIModule | null | undefined;

export function getRevenueCatUI(): RevenueCatUIModule | null {
  if (cached !== undefined) return cached;
  try {
    const mod = require("react-native-purchases-ui");
    const resolved = (mod?.default ?? mod) as RevenueCatUIModule | undefined;
    // A module that loaded but has no presentPaywall is not usable.
    cached = resolved && typeof resolved.presentPaywall === "function" ? resolved : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** True when RevenueCat's own paywall/customer-center UI can be rendered. */
export const revenueCatUIAvailable = () => getRevenueCatUI() !== null;
