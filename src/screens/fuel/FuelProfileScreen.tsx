import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useFuel } from "../../contexts/FuelContext";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function FuelProfileScreen({ navigation }: any) {
  const { user } = useAuth();
  const { meals, localPosts, savedPostIds } = useFuel();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Strictly athlete";
  const username = (user?.firstName || user?.email?.split("@")[0] || "athlete").toLowerCase();
  return <ScreenShell>
    <View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{name[0].toUpperCase()}</Text></View><Text style={styles.name}>{name}</Text><Text style={styles.username}>@{username}</Text><Text style={styles.bio}>Training with intention. Learning what fuel works, one session at a time.</Text></View>
    <View style={styles.stats}>{[[localPosts.length, "Fuel posts"], [savedPostIds.length, "Saved"], [meals.length, "Meals logged"]].map(([value, label]) => <View key={label} style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View>
    <View style={styles.identity}><Text style={styles.identityLabel}>ATHLETE PROFILE</Text><View style={styles.tags}><Text style={styles.tag}>Runner</Text><Text style={styles.tag}>Cyclist</Text><Text style={styles.tag}>Lifter</Text></View><Text style={styles.identityNote}>Activity and dietary preferences will shape future recommendations without making follower counts the point.</Text></View>
    <Text style={styles.sectionTitle}>Account</Text>
    {[{ icon: "person-outline", label: "Personal details" }, { icon: "nutrition-outline", label: "Fuel preferences" }, { icon: "lock-closed-outline", label: "Privacy and sharing" }, { icon: "settings-outline", label: "App settings" }].map((item) => <TouchableOpacity key={item.label} style={styles.row} onPress={() => navigation.getParent()?.navigate("AccountLegacy")}><View style={styles.rowIcon}><Ionicons name={item.icon as any} size={18} color={strictlyColors.ink} /></View><Text style={styles.rowText}>{item.label}</Text><Ionicons name="chevron-forward" size={17} color={strictlyColors.textSoft} /></TouchableOpacity>)}
    <View style={styles.principle}><Ionicons name="shield-checkmark-outline" size={22} color={strictlyColors.ink} /><View style={styles.principleCopy}><Text style={styles.principleTitle}>Private by default</Text><Text style={styles.principleText}>Meals and workouts are private unless you explicitly create a community post.</Text></View></View>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", paddingTop: 16 },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: strictlyColors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.lime, fontSize: 29 },
  name: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 25, marginTop: 13 },
  username: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9, marginTop: 4 },
  bio: { maxWidth: 300, textAlign: "center", fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 10 },
  stats: { flexDirection: "row", marginTop: 22, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large },
  stat: { flex: 1, alignItems: "center", paddingVertical: 15 },
  statValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 20 },
  statLabel: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 8, marginTop: 3 },
  identity: { padding: 16, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large, marginTop: 12 },
  identityLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.2 },
  tags: { flexDirection: "row", gap: 6, marginTop: 10 },
  tag: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 10, backgroundColor: strictlyColors.white, paddingHorizontal: 10, paddingVertical: 7, borderRadius: strictlyRadius.pill },
  identityNote: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 11 },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 18, marginTop: 24, marginBottom: 9 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, marginBottom: 7 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 12 },
  principle: { flexDirection: "row", gap: 11, padding: 16, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.large, marginTop: 14 },
  principleCopy: { flex: 1 },
  principleTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 13 },
  principleText: { fontFamily: strictlyType.sans, color: strictlyColors.ink, fontSize: 10, lineHeight: 15, marginTop: 3 },
});

