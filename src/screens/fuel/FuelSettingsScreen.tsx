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
    <AthleteBasicsForm profile={profile} onChange={setProfile} />
    <View style={styles.divider} />
    <NutritionProfileForm profile={profile} onChange={setProfile} />
    <View style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={19} color={strictlyColors.text} /><Text style={styles.privacyText}>Allergies act as hard exclusions in curated meal ideas. Health conditions are context only and never treated as a diagnosis.</Text></View>
    <TouchableOpacity style={styles.save} onPress={save}><Text style={styles.saveText}>{saving ? "Saving…" : "Save fuel profile"}</Text></TouchableOpacity>
    <TouchableOpacity style={styles.signOut} onPress={signOut}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: strictlyColors.border, marginVertical: 30 }, privacy: { flexDirection: "row", gap: 10, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream }, privacyText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 10, lineHeight: 16 }, save: { height: 56, alignItems: "center", justifyContent: "center", marginTop: 16, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime }, saveText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 13 }, signOut: { height: 50, alignItems: "center", justifyContent: "center" }, signOutText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.danger, fontSize: 12 },
});
