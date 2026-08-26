import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { FuelTargetCard } from "../../components/fuel/FuelTargetCard";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function FuelTargetScreen({ navigation }: any) {
  const { workout, target } = useFuel();
  if (!workout || !target) return <ScreenShell title="Fuel target" back onBack={() => navigation.goBack()}><Text style={styles.empty}>Calculate a workout first.</Text></ScreenShell>;
  return <ScreenShell title="Today’s fuel" eyebrow="WORKOUT READY" back onBack={() => navigation.goBack()}>
    <FuelTargetCard workout={workout} target={target} />
    <View style={styles.note}><Ionicons name="information-circle-outline" size={19} color={strictlyColors.ink} /><Text style={styles.noteText}>{target.rationale} Treat the speed split as a practical estimate and adjust for your own tolerance.</Text></View>
    <Text style={styles.sectionTitle}>Choose your next move</Text>
    <TouchableOpacity style={styles.actionPrimary} onPress={() => navigation.navigate("BuildMeal")}><View style={styles.actionIcon}><Ionicons name="restaurant-outline" size={21} color={strictlyColors.ink} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>Build a meal</Text><Text style={styles.actionText}>Search foods and match the target precisely.</Text></View><Ionicons name="arrow-forward" size={18} color={strictlyColors.ink} /></TouchableOpacity>
    <TouchableOpacity style={styles.action} onPress={() => navigation.navigate("Main", { screen: "Scan" })}><View style={styles.actionIcon}><Ionicons name="camera-outline" size={21} color={strictlyColors.ink} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>Scan my meal</Text><Text style={styles.actionText}>Get an estimate, then correct every item.</Text></View><Ionicons name="arrow-forward" size={18} color={strictlyColors.ink} /></TouchableOpacity>
    <TouchableOpacity style={styles.action} onPress={() => navigation.navigate("Main", { screen: "Discover" })}><View style={styles.actionIcon}><Ionicons name="people-outline" size={21} color={strictlyColors.ink} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>See meals like this</Text><Text style={styles.actionText}>Browse fuel for similar workouts and timing.</Text></View><Ionicons name="arrow-forward" size={18} color={strictlyColors.ink} /></TouchableOpacity>

    <View style={styles.intra}><Text style={styles.intraEyebrow}>DURING THE WORKOUT</Text><Text style={styles.intraValue}>{target.intraWorkout.required ? `${target.intraWorkout.lowPerHour}–${target.intraWorkout.highPerHour} g/hour` : "Not required"}</Text><Text style={styles.intraText}>{target.intraWorkout.note}</Text></View>
    <Text style={styles.disclaimer}>Strictly provides general sports-fueling guidance, not medical advice. Individual needs and gastrointestinal tolerance vary.</Text>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  empty: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft },
  note: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, marginTop: 12 },
  noteText: { flex: 1, fontFamily: strictlyType.sans, fontSize: 12, lineHeight: 18, color: strictlyColors.ink },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 19, marginTop: 28, marginBottom: 10 },
  action: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, marginBottom: 9 },
  actionPrimary: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.lime, marginBottom: 9 },
  actionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1 },
  actionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 14 },
  actionText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginTop: 3 },
  intra: { padding: 18, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, marginTop: 20 },
  intraEyebrow: { fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.4, color: strictlyColors.textSoft },
  intraValue: { fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 26, color: strictlyColors.ink, marginTop: 10 },
  intraText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 7 },
  disclaimer: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 18 },
});

