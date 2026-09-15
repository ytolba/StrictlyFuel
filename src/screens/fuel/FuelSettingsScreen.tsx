import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { AthleteBasicsForm } from "../../components/AthleteBasicsForm";
import { NutritionProfileForm } from "../../components/NutritionProfileForm";
import { EMPTY_NUTRITION_PROFILE, type NutritionProfile } from "../../types/nutritionProfile";
import { loadNutritionProfile, saveNutritionProfile } from "../../services/nutritionProfileService";
import { useAuth } from "../../contexts/AuthContext";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function FuelSettingsScreen({ navigation }: any) {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);
  const [saving, setSaving] = useState(false);
  useEffect(() => { loadNutritionProfile().then(setProfile); }, []);
  const save = async () => { setSaving(true); await saveNutritionProfile(profile); setSaving(false); Alert.alert("Fuel profile saved", "Future targets and meal ideas will use these preferences."); };
  return <ScreenShell title="Fuel profile" eyebrow="PERSONALIZATION" back onBack={() => navigation.goBack()}>
    <TouchableOpacity style={styles.health} onPress={() => navigation.navigate("HealthWorkouts")}><View style={styles.healthMark}><Ionicons name="heart-outline" size={18} color={strictlyColors.accentText} /></View><View style={styles.healthCopy}><Text style={styles.healthTitle}>Apple Health</Text><Text style={styles.healthText}>Connect your workouts and reuse a recent session.</Text></View><Ionicons name="chevron-forward" size={18} color={strictlyColors.textSoft} /></TouchableOpacity>
    <AthleteBasicsForm profile={profile} onChange={setProfile} />
    <View style={styles.divider} />
    <NutritionProfileForm profile={profile} onChange={setProfile} />
    <View style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={19} color={strictlyColors.text} /><Text style={styles.privacyText}>Allergies act as hard exclusions in curated meal ideas. Health conditions are context only and never treated as a diagnosis.</Text></View>
    <TouchableOpacity style={styles.save} onPress={save}><Text style={styles.saveText}>{saving ? "Saving…" : "Save fuel profile"}</Text></TouchableOpacity>
    <TouchableOpacity style={styles.signOut} onPress={signOut}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  health: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 11, padding: 13, marginBottom: 18, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  healthMark: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted, borderWidth: 1, borderColor: strictlyColors.border }, healthCopy: { flex: 1 },
  healthTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 14 }, healthText: { marginTop: 3, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 15 },
  divider: { height: 1, backgroundColor: strictlyColors.border, marginVertical: 30 }, privacy: { flexDirection: "row", gap: 10, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream }, privacyText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11, lineHeight: 16 }, save: { height: 56, alignItems: "center", justifyContent: "center", marginTop: 16, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime }, saveText: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 13 }, signOut: { height: 50, alignItems: "center", justifyContent: "center" }, signOutText: { fontFamily: strictlyType.bold,  color: strictlyColors.danger, fontSize: 12 },
});
