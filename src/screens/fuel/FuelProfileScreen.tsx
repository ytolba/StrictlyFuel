import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useFuel } from "../../contexts/FuelContext";
import { useSubscription } from "../../provider/RevenuCatProvider";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LEGAL_URLS, SCAN_LIMITS } from "../../config/monetization";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";
import { useStrictlyAppearance, type AppearanceMode } from "../../contexts/AppearanceContext";

export default function FuelProfileScreen({ navigation }: any) {
  const { user, signOut, deleteAccount } = useAuth();
  const { meals, localPosts, savedPostIds } = useFuel();
  const { isPro, scansRemaining, scanLimit } = useSubscription();
  const [deleting, setDeleting] = useState(false);
  const { mode, setMode } = useStrictlyAppearance();

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Strictly athlete";
  const username = (user?.firstName || user?.email?.split("@")[0] || "athlete").toLowerCase();

  const confirmDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your account, workouts, meals and posts. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const row = (opts: { icon: string; label: string; detail?: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity key={opts.label} style={styles.row} onPress={opts.onPress}>
      <View style={[styles.rowIcon, opts.danger && styles.rowIconDanger]}>
        <Ionicons name={opts.icon as any} size={18} color={opts.danger ? strictlyColors.danger : strictlyColors.text} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowText, opts.danger && styles.rowTextDanger]}>{opts.label}</Text>
        {opts.detail ? <Text style={styles.rowDetail}>{opts.detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={strictlyColors.textSoft} />
    </TouchableOpacity>
  );

  return (
    <ScreenShell title="Profile" back onBack={() => navigation.goBack()}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.username}>@{username}</Text>
      </View>

      <View style={styles.stats}>
        {([[localPosts.length, "Fuel posts"], [savedPostIds.length, "Saved"], [meals.length, "Meals logged"]] as const).map(([value, label]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Plan status doubles as the upgrade entry point. */}
      <TouchableOpacity style={[styles.plan, isPro && styles.planPro]} onPress={() => navigation.navigate("Paywall")}>
        <View style={styles.planIcon}>
          <Ionicons name={isPro ? "checkmark-circle" : "flash-outline"} size={22} color={strictlyColors.onLime} />
        </View>
        <View style={styles.planCopy}>
          <Text style={styles.planTitle}>{isPro ? "StrictlyFuel Pro" : "Free plan"}</Text>
          <Text style={styles.planText}>
            {isPro
              ? `${scansRemaining} of ${SCAN_LIMITS.pro} meal scans left this week.`
              : `${scansRemaining} of ${scanLimit} free meal scans left this week. Resets Monday.`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={strictlyColors.onLime} />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Settings</Text>
      {row({ icon: "person-outline", label: "Body and units", onPress: () => navigation.navigate("Settings") })}
      {row({ icon: "nutrition-outline", label: "Diet, allergies and sensitivities", onPress: () => navigation.navigate("Settings") })}

      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.appearanceCard}>
        <View style={styles.appearanceCopy}>
          <Text style={styles.appearanceTitle}>Choose your look</Text>
          <Text style={styles.appearanceText}>Cream and green in every mode. System follows your iPhone.</Text>
        </View>
        <View style={styles.appearanceSegment}>
          {(["system", "light", "dark"] as AppearanceMode[]).map((value) => {
            const active = mode === value;
            return (
              <TouchableOpacity
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(value)}
                style={[styles.appearanceChoice, active && styles.appearanceChoiceActive]}
              >
                <Ionicons
                  name={value === "system" ? "phone-portrait-outline" : value === "light" ? "sunny-outline" : "moon-outline"}
                  size={15}
                  color={active ? strictlyColors.onLime : strictlyColors.textSoft}
                />
                <Text style={[styles.appearanceChoiceText, active && styles.appearanceChoiceTextActive]}>{value}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Legal</Text>
      {row({ icon: "document-text-outline", label: "Terms of Use", onPress: () => Linking.openURL(LEGAL_URLS.terms) })}
      {row({ icon: "lock-closed-outline", label: "Privacy Policy", onPress: () => Linking.openURL(LEGAL_URLS.privacy) })}

      <Text style={styles.sectionTitle}>Account</Text>
      {row({ icon: "log-out-outline", label: "Sign out", onPress: signOut })}
      {deleting ? (
        <View style={styles.deleting}>
          <ActivityIndicator color={strictlyColors.danger} />
          <Text style={styles.deletingText}>Deleting your account…</Text>
        </View>
      ) : (
        row({
          icon: "trash-outline",
          label: "Delete account",
          detail: "Permanently removes your account and all its data.",
          onPress: confirmDelete,
          danger: true,
        })
      )}

      <View style={styles.principle}>
        <Ionicons name="shield-checkmark-outline" size={22} color={strictlyColors.lime} />
        <View style={styles.principleCopy}>
          <Text style={styles.principleTitle}>Private by default</Text>
          <Text style={styles.principleText}>Meals and workouts are private unless you explicitly create a community post.</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", paddingTop: 16 },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: strictlyColors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.lime, fontSize: 29 },
  name: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 25, marginTop: 13 },
  username: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9, marginTop: 4 },

  stats: { flexDirection: "row", marginTop: 22, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large },
  stat: { flex: 1, alignItems: "center", paddingVertical: 15 },
  statValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 20 },
  statLabel: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, marginTop: 3 },

  plan: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, marginTop: 12, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.lime },
  planPro: { backgroundColor: strictlyColors.lime },
  planIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(10,28,18,0.12)", alignItems: "center", justifyContent: "center" },
  planCopy: { flex: 1 },
  planTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 15 },
  planText: { fontFamily: strictlyType.sans, color: strictlyColors.onLimeSoft, fontSize: 11, lineHeight: 16, marginTop: 3 },

  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 18, marginTop: 24, marginBottom: 9 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, marginBottom: 7 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  rowIconDanger: { backgroundColor: strictlyColors.dangerSurface },
  rowCopy: { flex: 1 },
  rowText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 13 },
  rowTextDanger: { color: strictlyColors.danger },
  rowDetail: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },

  appearanceCard: { padding: 14, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large },
  appearanceCopy: { marginBottom: 12 },
  appearanceTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 13 },
  appearanceText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },
  appearanceSegment: { flexDirection: "row", gap: 7 },
  appearanceChoice: { flex: 1, minHeight: 44, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  appearanceChoiceActive: { backgroundColor: strictlyColors.lime },
  appearanceChoiceText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.textSoft, fontSize: 10, textTransform: "capitalize" },
  appearanceChoiceTextActive: { color: strictlyColors.onLime, fontWeight: "900" },

  deleting: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 58, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.dangerSurface },
  deletingText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.danger, fontSize: 12 },

  principle: { flexDirection: "row", gap: 11, padding: 16, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large, marginTop: 14 },
  principleCopy: { flex: 1 },
  principleTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 13 },
  principleText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 3 },
});
