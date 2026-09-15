import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useSubscription } from "../../provider/RevenuCatProvider";
import { getRevenueCatUI } from "../../lib/revenueCatUI";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LEGAL_URLS, PLAN_COPY, PRO_BENEFITS, SCAN_LIMITS, USE_REVENUECAT_PAYWALL } from "../../config/monetization";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type PlanKey = "yearly" | "monthly";

export default function PaywallScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    isPro,
    billingAvailable,
    paywallUIAvailable,
    currentOffering,
    monthlyPackage,
    yearlyPackage,
    purchasePackage,
    restorePermissions,
    refreshCustomerInfo,
    presentCustomerCenter,
    scansUsed,
    scanLimit,
  } = useSubscription();

  /**
   * RevenueCat's own paywall renders only when the native UI package is linked
   * and StoreKit is reachable. Everywhere else — Expo Go, the web bundle, a dev
   * client built before react-native-purchases-ui was added — we fall through
   * to the hand-built screen below rather than showing a blank modal.
   */
  const RevenueCatUI = getRevenueCatUI();
  const [selected, setSelected] = useState<PlanKey>("yearly");
  const [busy, setBusy] = useState(false);
  const hasMonthlyPlan = Boolean(monthlyPackage);
  const close = () => navigation.canGoBack?.() ? navigation.goBack() : navigation.navigate("Main");
  const closeButton = <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close subscription page" hitSlop={12} onPress={close} style={styles.closeButton}><Ionicons name="close" size={23} color={strictlyColors.text} /></TouchableOpacity>;

  const packFor = (plan: PlanKey): PurchasesPackage | undefined => (plan === "yearly" ? yearlyPackage : monthlyPackage);

  // Prefer the real StoreKit price string; fall back to our copy only when the
  // store has not loaded (simulator, offline, Expo Go).
  const priceFor = (plan: PlanKey) => packFor(plan)?.product?.priceString || PLAN_COPY[plan].price;

  const monthlyEquivalent = () => {
    const storeEquivalent = yearlyPackage?.product?.pricePerMonthString;
    if (storeEquivalent) return `${storeEquivalent}/month equivalent`;
    const price = yearlyPackage?.product?.price;
    if (!price) return "about $2.50/month";
    return `about $${(price / 12).toFixed(2)}/month`;
  };

  const yearlySavings = () => {
    const monthlyPrice = monthlyPackage?.product?.price;
    const yearlyPrice = yearlyPackage?.product?.price;
    if (!monthlyPrice || !yearlyPrice || monthlyPrice * 12 <= yearlyPrice) return null;
    return Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);
  };

  const buy = async () => {
    const pack = packFor(selected);
    if (!pack) {
      Alert.alert(
        "Subscriptions unavailable",
        billingAvailable
          ? "These plans aren’t loading from the App Store right now. Please try again in a moment."
          : "In-app purchases aren’t available in this build. Try a TestFlight or App Store build on a real device."
      );
      return;
    }
    setBusy(true);
    const result = await purchasePackage(pack);
    setBusy(false);
    if (result.cancelled) return;
    if (result.success) {
      Alert.alert("You’re on Pro", "Your meal scans and reshuffles are unlocked.", [{ text: "Let’s go", onPress: () => navigation.goBack() }]);
    } else if (result.error) {
      Alert.alert("Purchase didn’t complete", result.error);
    }
  };

  const restore = async () => {
    setBusy(true);
    const info = await restorePermissions();
    setBusy(false);
    const active = Boolean(info && Object.keys(info.entitlements.active).length);
    Alert.alert(
      active ? "Purchases restored" : "Nothing to restore",
      active ? "Your subscription is active again on this device." : "We couldn’t find an active subscription for this Apple ID."
    );
  };

  const useRemotePaywall =
    USE_REVENUECAT_PAYWALL && paywallUIAvailable && billingAvailable && !isPro && Boolean(RevenueCatUI?.Paywall);

  const onRemotePurchase = useCallback(
    async ({ customerInfo }: { customerInfo?: CustomerInfo } = {}) => {
      // The provider's customerInfo listener already fires here; this call just
      // makes sure the screen closes against fresh state.
      if (!customerInfo) await refreshCustomerInfo();
      close();
    },
    [navigation, refreshCustomerInfo]
  );

  if (useRemotePaywall && RevenueCatUI) {
    return (
      <View style={styles.remoteWrap}>
        <RevenueCatUI.Paywall
          style={styles.remotePaywall}
          options={currentOffering ? { offering: currentOffering } : undefined}
          onPurchaseCompleted={onRemotePurchase}
          onRestoreCompleted={onRemotePurchase}
          onPurchaseError={({ error }: { error?: { message?: string } }) => {
            Alert.alert("Purchase didn’t complete", error?.message || "Please try again.");
          }}
          onRestoreError={() => {
            Alert.alert("Restore failed", "We couldn’t reach the App Store. Please try again.");
          }}
          onDismiss={close}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close subscription page" hitSlop={14} onPress={close} style={[styles.remoteClose, { top: insets.top + 10 }]}><Ionicons name="close" size={24} color={strictlyColors.text} /></TouchableOpacity>
      </View>
    );
  }

  if (isPro) {
    return (
      <ScreenShell title="StrictlyFuel Pro" eyebrow="ACTIVE" action={closeButton}>
        <View style={styles.activeCard}>
          <Ionicons name="checkmark-circle" size={40} color={strictlyColors.accentText} />
          <Text style={styles.activeTitle}>Pro is active</Text>
          <Text style={styles.activeText}>
            You have {SCAN_LIMITS.pro} meal scans a week. Manage or cancel any time in your Apple ID subscription settings.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.manage}
          onPress={async () => {
            // Customer Center handles cancellation, plan changes, refund
            // requests and win-back offers in-app. Fall back to Apple's
            // settings page when it is not linked into this build.
            const opened = await presentCustomerCenter();
            if (!opened) Linking.openURL("https://apps.apple.com/account/subscriptions");
          }}
        >
          <Text style={styles.manageText}>Manage subscription</Text>
          <Ionicons name="open-outline" size={17} color={strictlyColors.text} />
        </TouchableOpacity>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Fuel without limits" eyebrow="STRICTLYFUEL PRO" action={closeButton}>
      <Text style={styles.intro}>
        You’ve used {scansUsed} of {scanLimit} AI meal scans this week. Pro lifts that to {SCAN_LIMITS.pro} a week and unlocks unlimited
        meal reshuffles.
      </Text>

      <View style={styles.benefits}>
        {PRO_BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name={benefit.icon as any} size={19} color={strictlyColors.onLime} />
            </View>
            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Choose your plan</Text>

      <TouchableOpacity style={[styles.plan, selected === "yearly" && styles.planActive]} onPress={() => setSelected("yearly")} accessibilityRole="radio" accessibilityState={{ selected: selected === "yearly" }}>
        <View style={styles.planLeft}>
          <View style={[styles.radio, selected === "yearly" && styles.radioActive]}>{selected === "yearly" ? <View style={styles.radioDot} /> : null}</View>
          <View>
            <Text style={styles.planName}>Yearly</Text>
            <Text style={styles.planNote}>{monthlyEquivalent()}{yearlySavings() ? ` · save ${yearlySavings()}%` : ""}</Text>
          </View>
        </View>
        <View style={styles.planRight}>
          <Text style={styles.planPrice}>{priceFor("yearly")}</Text>
          <Text style={styles.planPeriod}>per year</Text>
        </View>
      </TouchableOpacity>

      {hasMonthlyPlan ? (
        <TouchableOpacity style={[styles.plan, selected === "monthly" && styles.planActive]} onPress={() => setSelected("monthly")} accessibilityRole="radio" accessibilityState={{ selected: selected === "monthly" }}>
          <View style={styles.planLeft}>
            <View style={[styles.radio, selected === "monthly" && styles.radioActive]}>{selected === "monthly" ? <View style={styles.radioDot} /> : null}</View>
            <View>
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planNote}>Cancel any time</Text>
            </View>
          </View>
          <View style={styles.planRight}>
            <Text style={styles.planPrice}>{priceFor("monthly")}</Text>
            <Text style={styles.planPeriod}>per month</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={[styles.cta, busy && styles.ctaBusy]} onPress={buy} disabled={busy}>
        {busy ? <ActivityIndicator color={strictlyColors.onLime} /> : (
          <>
            <Text style={styles.ctaText}>Continue with {selected === "yearly" ? "Yearly" : "Monthly"}</Text>
            <Ionicons name="arrow-forward" size={18} color={strictlyColors.onLime} />
          </>
        )}
      </TouchableOpacity>

      {/* Guideline 3.1.2 requires price, duration, renewal and cancellation
          terms to be visible before purchase — not only in App Store Connect. */}
      <Text style={styles.terms}>
        This is an auto-renewable subscription at {priceFor(selected)} per {selected === "yearly" ? "year" : "month"}. Payment is
        charged to your Apple ID at confirmation and renews unless cancelled at least 24 hours before the current period ends.
        Any introductory offer you are eligible for appears in Apple’s purchase confirmation. Manage or cancel in Apple ID settings.
      </Text>

      <TouchableOpacity style={styles.restore} onPress={restore} disabled={busy}>
        <Text style={styles.restoreText}>Restore purchases</Text>
      </TouchableOpacity>

      <View style={styles.legal}>
        <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.terms)}>
          <Text style={styles.legalLink}>Terms of Use</Text>
        </TouchableOpacity>
        <Text style={styles.legalDot}>·</Text>
        <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.privacy)}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      {!billingAvailable ? (
        <Text style={styles.devNote}>
          In-app purchases are unavailable in this build. Use a TestFlight or App Store build on a real device to test checkout.
        </Text>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  remoteWrap: { flex: 1, backgroundColor: strictlyColors.background },
  remotePaywall: { flex: 1 },
  remoteClose: { position: "absolute", right: 16, zIndex: 20, width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },

  intro: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20, marginBottom: 18 },

  benefits: { gap: 8 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  benefitIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  benefitCopy: { flex: 1 },
  benefitTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 13 },
  benefitText: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 3 },

  sectionTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 19, marginTop: 26, marginBottom: 10 },

  plan: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, marginBottom: 9, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 2, borderColor: strictlyColors.border },
  planActive: { borderColor: strictlyColors.accentText, backgroundColor: strictlyColors.surfaceMuted },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: strictlyColors.borderStrong, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: strictlyColors.accentText },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: strictlyColors.lime },
  planName: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 16 },
  planNote: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, marginTop: 3 },
  planRight: { alignItems: "flex-end" },
  planPrice: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 18 },
  planPeriod: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, marginTop: 3 },

  cta: { height: 58, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 15 },

  terms: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 14 },

  restore: { height: 46, alignItems: "center", justifyContent: "center", marginTop: 6 },
  restoreText: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 12, textDecorationLine: "underline" },

  legal: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 },
  legalLink: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, textDecorationLine: "underline" },
  legalDot: { color: strictlyColors.textSoft, fontSize: 11 },

  devNote: { fontFamily: strictlyType.regular, color: strictlyColors.clay, fontSize: 11, lineHeight: 15, marginTop: 14, textAlign: "center" },

  activeCard: { alignItems: "center", padding: 26, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  activeTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 22, marginTop: 12 },
  activeText: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8 },
  manage: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  manageText: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 13 },
});
