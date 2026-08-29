import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useSubscription } from "../../provider/RevenuCatProvider";
import { getRevenueCatUI } from "../../lib/revenueCatUI";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LEGAL_URLS, PLAN_COPY, PRO_BENEFITS, SCAN_LIMITS, USE_REVENUECAT_PAYWALL } from "../../config/monetization";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type PlanKey = "yearly" | "monthly";

export default function PaywallScreen({ navigation }: any) {
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

  const packFor = (plan: PlanKey): PurchasesPackage | undefined => (plan === "yearly" ? yearlyPackage : monthlyPackage);

  // Prefer the real StoreKit price string; fall back to our copy only when the
  // store has not loaded (simulator, offline, Expo Go).
  const priceFor = (plan: PlanKey) => packFor(plan)?.product?.priceString || PLAN_COPY[plan].price;

  const monthlyEquivalent = () => {
    const price = yearlyPackage?.product?.price;
    if (!price) return "about $2.50/month";
    return `about $${(price / 12).toFixed(2)}/month`;
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
      navigation.goBack();
    },
    [navigation, refreshCustomerInfo]
  );

  if (useRemotePaywall && RevenueCatUI) {
    return (
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
        onDismiss={() => navigation.goBack()}
      />
    );
  }

  if (isPro) {
    return (
      <ScreenShell title="StrictlyFuel Pro" eyebrow="ACTIVE" back onBack={() => navigation.goBack()}>
        <View style={styles.activeCard}>
          <Ionicons name="checkmark-circle" size={40} color={strictlyColors.lime} />
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
    <ScreenShell title="Fuel without limits" eyebrow="STRICTLYFUEL PRO" back onBack={() => navigation.goBack()}>
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
            <Text style={styles.planNote}>{monthlyEquivalent()} · save 50%</Text>
          </View>
        </View>
        <View style={styles.planRight}>
          <Text style={styles.planPrice}>{priceFor("yearly")}</Text>
          <Text style={styles.planPeriod}>per year</Text>
        </View>
      </TouchableOpacity>

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

      <TouchableOpacity style={[styles.cta, busy && styles.ctaBusy]} onPress={buy} disabled={busy}>
        {busy ? <ActivityIndicator color={strictlyColors.onLime} /> : (
          <>
            <Text style={styles.ctaText}>Start {PLAN_COPY.trialDays}-day free trial</Text>
            <Ionicons name="arrow-forward" size={18} color={strictlyColors.onLime} />
          </>
        )}
      </TouchableOpacity>

      {/* Guideline 3.1.2 requires price, duration, renewal and cancellation
          terms to be visible before purchase — not only in App Store Connect. */}
      <Text style={styles.terms}>
        Your {PLAN_COPY.trialDays}-day free trial is free. After it ends, your subscription renews automatically at{" "}
        {priceFor(selected)} per {selected === "yearly" ? "year" : "month"} unless cancelled at least 24 hours before the trial
        ends. Payment is charged to your Apple ID at confirmation of purchase. Manage or cancel in your Apple ID settings.
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
  remotePaywall: { flex: 1 },

  intro: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20, marginBottom: 18 },

  benefits: { gap: 8 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  benefitIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  benefitCopy: { flex: 1 },
  benefitTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 13 },
  benefitText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 3 },

  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 19, marginTop: 26, marginBottom: 10 },

  plan: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, marginBottom: 9, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 2, borderColor: strictlyColors.border },
  planActive: { borderColor: strictlyColors.lime, backgroundColor: strictlyColors.surfaceMuted },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: strictlyColors.borderStrong, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: strictlyColors.lime },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: strictlyColors.lime },
  planName: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 16 },
  planNote: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginTop: 3 },
  planRight: { alignItems: "flex-end" },
  planPrice: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 18 },
  planPeriod: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9, marginTop: 3 },

  cta: { height: 58, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 15 },

  terms: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 16, marginTop: 14 },

  restore: { height: 46, alignItems: "center", justifyContent: "center", marginTop: 6 },
  restoreText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12, textDecorationLine: "underline" },

  legal: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 },
  legalLink: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, textDecorationLine: "underline" },
  legalDot: { color: strictlyColors.textSoft, fontSize: 11 },

  devNote: { fontFamily: strictlyType.sans, color: strictlyColors.clay, fontSize: 10, lineHeight: 15, marginTop: 14, textAlign: "center" },

  activeCard: { alignItems: "center", padding: 26, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  activeTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 22, marginTop: 12 },
  activeText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8 },
  manage: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  manageText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 13 },
});
