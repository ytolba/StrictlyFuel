import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import {
  OFFERING_ID,
  PACKAGE_IDS,
  PRO_ENTITLEMENT,
  RC_PACKAGE_IDS,
  TEST_STORE_MIN_SDK,
  resolveApiKey,
} from "../config/monetization";
import { limitFor, loadUsage, recordUse, setUsage } from "../services/entitlementService";
import { supabase } from "../lib/supabase";
import { PAYWALL_SUCCESS, getRevenueCatUI, type PaywallResult } from "../lib/revenueCatUI";

/**
 * Purchases run through RevenueCat, which is a thin wrapper over Apple's
 * StoreKit — every transaction is a real Apple In-App Purchase, as guideline
 * 3.1.1 requires. RevenueCat only handles receipt validation and entitlement
 * state; it never takes the payment itself.
 *
 * The client is *not* the source of truth. `consume_ai_credit()` on the server
 * reads `public.user_subscriptions`, which the revenuecat-webhook edge function
 * writes. Everything here exists so the UI can react instantly; the server
 * still decides what a user is actually allowed to do.
 */

export interface UserState {
  cookies: number;
  items: string[];
  pro: boolean;
}

export type PurchaseOutcome = {
  success: boolean;
  cancelled?: boolean;
  error?: string;
  customerInfo?: CustomerInfo;
};

interface RevenueCatProps {
  /** True once the SDK has been configured and entitlements read at least once. */
  ready: boolean;
  /** False in Expo Go / simulators without StoreKit, so the UI can explain itself. */
  billingAvailable: boolean;
  /** True when react-native-purchases-ui is linked and its screens can render. */
  paywallUIAvailable: boolean;
  isPro: boolean;

  customerInfo: CustomerInfo | null;
  proEntitlement: PurchasesEntitlementInfo | null;
  currentOffering: PurchasesOffering | null;
  packages: PurchasesPackage[];
  monthlyPackage?: PurchasesPackage;
  yearlyPackage?: PurchasesPackage;

  // Weekly AI scan allowance.
  scansUsed: number;
  scanLimit: number;
  scansRemaining: number;
  canScan: boolean;
  consumeScan: () => Promise<void>;

  // Weekly meal-idea reshuffle allowance.
  reshufflesUsed: number;
  reshuffleLimit: number;
  reshufflesRemaining: number;
  canReshuffle: boolean;
  consumeReshuffle: () => Promise<void>;

  refreshUsage: () => Promise<void>;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  refreshOfferings: () => Promise<PurchasesOffering | null>;

  purchasePackage: (pack: PurchasesPackage) => Promise<PurchaseOutcome>;
  restorePermissions: () => Promise<CustomerInfo | null>;

  /** RevenueCat's remotely-configured paywall. Returns null when unavailable. */
  presentPaywall: () => Promise<PaywallResult | null>;
  /** Same, but a no-op for customers who already hold the entitlement. */
  presentPaywallIfNeeded: () => Promise<PaywallResult | null>;
  /** RevenueCat's self-service subscription management screen. */
  presentCustomerCenter: () => Promise<boolean>;

  /** Retained for older screens that read the legacy shape. */
  user: UserState;
}

const RevenueCatContext = createContext<RevenueCatProps | null>(null);

export const useRevenueCat = (): RevenueCatProps => {
  const context = useContext(RevenueCatContext);
  if (!context) throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  return context;
};

/** Convenience alias — this provider is really about subscription state. */
export const useSubscription = useRevenueCat;

/**
 * Find a package by the identifiers we expect, then by package type. Offerings
 * built with RevenueCat's default packages use `$rc_monthly` / `$rc_annual`;
 * offerings built by hand use whatever the dashboard says. Supporting both
 * means renaming a package in the dashboard cannot silently break checkout.
 */
const findPackage = (
  offering: PurchasesOffering | null,
  all: PurchasesPackage[],
  plan: "monthly" | "yearly"
): PurchasesPackage | undefined => {
  const wantedType = plan === "monthly" ? PACKAGE_TYPE.MONTHLY : PACKAGE_TYPE.ANNUAL;
  const named = offering ? (plan === "monthly" ? offering.monthly : offering.annual) : null;

  return (
    all.find((item) => item.identifier === PACKAGE_IDS[plan]) ??
    all.find((item) => item.identifier === RC_PACKAGE_IDS[plan]) ??
    named ??
    all.find((item) => item.packageType === wantedType) ??
    undefined
  );
};

/** Turn a thrown value from the SDK into copy a customer can act on. */
const describePurchaseError = (error: unknown): PurchaseOutcome => {
  const purchasesError = error as Partial<PurchasesError> & { message?: string };
  switch (purchasesError?.code) {
    case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
      return { success: false, cancelled: true };
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return { success: false, error: "You already own this subscription. Try Restore purchases." };
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return { success: false, error: "Your payment is still being processed. Pro unlocks as soon as Apple approves it." };
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return { success: false, error: "This device isn’t allowed to make purchases. Check Screen Time restrictions." };
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return { success: false, error: "You appear to be offline. Reconnect and try again." };
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      return { success: false, error: "The App Store is having trouble right now. Please try again in a moment." };
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return { success: false, error: "That plan isn’t available on your account’s App Store region." };
    default:
      // `userCancelled` is deprecated but still set by older native layers.
      if ((purchasesError as any)?.userCancelled) return { success: false, cancelled: true };
      return { success: false, error: purchasesError?.message || "The purchase could not be completed." };
  }
};

export const RevenueCatProvider = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [scansUsed, setScansUsed] = useState(0);
  const [reshufflesUsed, setReshufflesUsed] = useState(0);

  // Guards against setState after unmount without disabling the listeners.
  const mounted = useRef(true);

  const applyCustomerInfo = useCallback((info?: CustomerInfo | null) => {
    if (!mounted.current) return;
    setCustomerInfo(info ?? null);
    setIsPro(Boolean(info?.entitlements.active[PRO_ENTITLEMENT]));
  }, []);

  const refreshUsage = useCallback(async () => {
    // Show the local mirror immediately so the UI never waits on the network.
    const [scans, reshuffles] = await Promise.all([loadUsage("scan"), loadUsage("reshuffle")]);
    if (mounted.current) {
      setScansUsed(scans.count);
      setReshufflesUsed(reshuffles.count);
    }

    // Then reconcile against the server ledger, which is the real gate.
    try {
      const { data, error } = await supabase.rpc("ai_credit_status");
      if (error || !Array.isArray(data)) return;
      for (const row of data as { feature: string; used: number }[]) {
        if (row.feature === "scan") {
          if (mounted.current) setScansUsed(row.used);
          await setUsage("scan", row.used);
        } else if (row.feature === "reshuffle") {
          if (mounted.current) setReshufflesUsed(row.used);
          await setUsage("reshuffle", row.used);
        }
      }
    } catch {
      // Offline or signed out — the local mirror stands until next launch.
    }
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
      return info;
    } catch {
      return null;
    }
  }, [applyCustomerInfo]);

  const refreshOfferings = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const offering = (OFFERING_ID ? offerings.all[OFFERING_ID] : offerings.current) ?? offerings.current ?? null;
      if (mounted.current) {
        setCurrentOffering(offering);
        setPackages(offering?.availablePackages ?? []);
      }
      return offering;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let removeListener: (() => void) | undefined;

    const init = async () => {
      await refreshUsage();

      const { apiKey, usingTestStore } = resolveApiKey();
      if (!apiKey) {
        if (mounted.current) setReady(true);
        return;
      }

      try {
        // Log level has to be set before configure to catch setup problems.
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);

        if (usingTestStore && __DEV__) {
          console.warn(
            `[RevenueCat] Using a Test Store key. This needs react-native-purchases ${TEST_STORE_MIN_SDK}+ and must never ship in a release build.`
          );
        }

        // Configure with the Supabase user id up front when we already have a
        // session. That avoids creating an anonymous RevenueCat identity and
        // then aliasing it, which is the usual cause of "the webhook fired but
        // nobody got upgraded".
        const { data: auth } = await supabase.auth.getUser();
        const appUserID = auth.user && !auth.user.is_anonymous ? auth.user.id : undefined;

        // Throws in Expo Go and anywhere the native module is unavailable.
        Purchases.configure({ apiKey, appUserID });
        if (!mounted.current) return;
        setBillingAvailable(true);

        // Fires on renewals, expirations, refunds and cross-device restores —
        // the only way the app learns about changes it did not initiate.
        const listener = (info: CustomerInfo) => applyCustomerInfo(info);
        Purchases.addCustomerInfoUpdateListener(listener);
        removeListener = () => Purchases.removeCustomerInfoUpdateListener(listener);

        await Promise.all([refreshCustomerInfo(), refreshOfferings()]);
      } catch {
        // No StoreKit here. The app stays fully usable on the free tier and the
        // paywall explains that purchases are unavailable rather than crashing.
        if (mounted.current) setBillingAvailable(false);
      } finally {
        if (mounted.current) setReady(true);
      }
    };

    init();

    // Keep the RevenueCat identity and the usage counters in step with auth.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      const user = session?.user;
      if (event === "SIGNED_OUT") {
        Purchases.logOut().catch(() => undefined);
        setIsPro(false);
        setCustomerInfo(null);
      } else if (user && !user.is_anonymous) {
        Purchases.logIn(user.id)
          .then(({ customerInfo: info }) => {
            applyCustomerInfo(info);
            // Offerings can be targeted per user, so re-read after identifying.
            refreshOfferings();
          })
          .catch(() => undefined);
      }
      refreshUsage();
    });

    return () => {
      mounted.current = false;
      removeListener?.();
      listener.subscription.unsubscribe();
    };
  }, [applyCustomerInfo, refreshCustomerInfo, refreshOfferings, refreshUsage]);

  /**
   * The server only learns about an upgrade through the RevenueCat webhook,
   * which lands a moment after the transaction. Re-read the ledger twice so the
   * new limit appears without the customer having to relaunch.
   */
  const reconcileAfterPurchase = useCallback(() => {
    setTimeout(() => { refreshUsage(); }, 2500);
    setTimeout(() => { refreshUsage(); }, 8000);
  }, [refreshUsage]);

  const purchase = useCallback(
    async (pack: PurchasesPackage): Promise<PurchaseOutcome> => {
      try {
        const { customerInfo: info } = await Purchases.purchasePackage(pack);
        applyCustomerInfo(info);
        reconcileAfterPurchase();
        return { customerInfo: info, success: Boolean(info?.entitlements.active[PRO_ENTITLEMENT]) };
      } catch (error) {
        return describePurchaseError(error);
      }
    },
    [applyCustomerInfo, reconcileAfterPurchase]
  );

  const restore = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
      reconcileAfterPurchase();
      return info;
    } catch {
      return null;
    }
  }, [applyCustomerInfo, reconcileAfterPurchase]);

  const presentPaywall = useCallback(async (): Promise<PaywallResult | null> => {
    const ui = getRevenueCatUI();
    if (!ui) return null;
    try {
      const result = await ui.presentPaywall(currentOffering ? { offering: currentOffering } : undefined);
      if (PAYWALL_SUCCESS.includes(result)) {
        await refreshCustomerInfo();
        reconcileAfterPurchase();
      }
      return result;
    } catch {
      return "ERROR";
    }
  }, [currentOffering, refreshCustomerInfo, reconcileAfterPurchase]);

  const presentPaywallIfNeeded = useCallback(async (): Promise<PaywallResult | null> => {
    const ui = getRevenueCatUI();
    if (!ui) return null;
    try {
      const result = await ui.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT,
        ...(currentOffering ? { offering: currentOffering } : {}),
      });
      if (PAYWALL_SUCCESS.includes(result)) {
        await refreshCustomerInfo();
        reconcileAfterPurchase();
      }
      return result;
    } catch {
      return "ERROR";
    }
  }, [currentOffering, refreshCustomerInfo, reconcileAfterPurchase]);

  const presentCustomerCenter = useCallback(async () => {
    const ui = getRevenueCatUI();
    if (!ui || typeof ui.presentCustomerCenter !== "function") return false;
    try {
      await ui.presentCustomerCenter({
        callbacks: {
          // A refund or a cancellation taken here changes entitlement state, so
          // pull fresh customer info once the sheet closes.
          onRestoreCompleted: ({ customerInfo: info }: { customerInfo: CustomerInfo }) => applyCustomerInfo(info),
          onRefundRequestCompleted: () => { refreshCustomerInfo(); },
          onManagementOptionSelected: () => { refreshCustomerInfo(); },
        },
      });
      await refreshCustomerInfo();
      return true;
    } catch {
      return false;
    }
  }, [applyCustomerInfo, refreshCustomerInfo]);

  const consumeScan = useCallback(async () => {
    const usage = await recordUse("scan");
    if (mounted.current) setScansUsed(usage.count);
  }, []);

  const consumeReshuffle = useCallback(async () => {
    const usage = await recordUse("reshuffle");
    if (mounted.current) setReshufflesUsed(usage.count);
  }, []);

  const scanLimit = limitFor("scan", isPro);
  const scansRemaining = Math.max(0, scanLimit - scansUsed);
  const reshuffleLimit = limitFor("reshuffle", isPro);
  const reshufflesRemaining = Math.max(0, reshuffleLimit - reshufflesUsed);

  const monthlyPackage = useMemo(() => findPackage(currentOffering, packages, "monthly"), [currentOffering, packages]);
  const yearlyPackage = useMemo(() => findPackage(currentOffering, packages, "yearly"), [currentOffering, packages]);
  const proEntitlement = customerInfo?.entitlements.active[PRO_ENTITLEMENT] ?? null;

  const value = useMemo<RevenueCatProps>(
    () => ({
      ready,
      billingAvailable,
      paywallUIAvailable: getRevenueCatUI() !== null,
      isPro,
      customerInfo,
      proEntitlement,
      currentOffering,
      packages,
      monthlyPackage,
      yearlyPackage,
      scansUsed,
      scanLimit,
      scansRemaining,
      canScan: scansRemaining > 0,
      consumeScan,
      reshufflesUsed,
      reshuffleLimit,
      reshufflesRemaining,
      canReshuffle: reshufflesRemaining > 0,
      consumeReshuffle,
      refreshUsage,
      refreshCustomerInfo,
      refreshOfferings,
      purchasePackage: purchase,
      restorePermissions: restore,
      presentPaywall,
      presentPaywallIfNeeded,
      presentCustomerCenter,
      user: { cookies: 0, items: [], pro: isPro },
    }),
    [
      ready, billingAvailable, isPro, customerInfo, proEntitlement, currentOffering, packages,
      monthlyPackage, yearlyPackage, scansUsed, scanLimit, scansRemaining, consumeScan,
      reshufflesUsed, reshuffleLimit, reshufflesRemaining, consumeReshuffle, refreshUsage,
      refreshCustomerInfo, refreshOfferings, purchase, restore, presentPaywall,
      presentPaywallIfNeeded, presentCustomerCenter,
    ]
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
};
