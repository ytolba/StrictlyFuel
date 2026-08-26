import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { CarbSpeedBar } from "../../components/fuel/CarbSpeedBar";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function MealAnalysisScreen({ navigation, route }: any) {
  const { meals, target } = useFuel();
  const meal = meals.find((item) => item.id === route.params?.mealId) || meals[0];
  if (!meal || !target) return <ScreenShell title="Meal analysis" back onBack={() => navigation.goBack()}><Text style={styles.missing}>This meal is no longer available.</Text></ScreenShell>;
  return <ScreenShell title="Meal analysis" eyebrow={meal.isEstimate ? "CAMERA ESTIMATE" : "DATABASE CALCULATION"} back onBack={() => navigation.goBack()}>
    {meal.imageUri ? <Image source={{ uri: meal.imageUri }} style={styles.photo} /> : null}
    <View style={styles.scoreCard}><View style={styles.scoreCircle}><Text style={styles.scoreValue}>{meal.score.total}</Text><Text style={styles.scoreOut}>/100</Text></View><View style={styles.scoreCopy}><Text style={styles.scoreTitle}>{meal.score.headline}</Text><Text style={styles.scoreText}>{meal.score.summary}</Text></View></View>
    <View style={styles.fit}><Text style={styles.fitLabel}>FOR THIS WORKOUT</Text><Text style={styles.fitText}>{meal.name}</Text><Text style={styles.fitCarbs}>{Math.round(meal.macros.carbs)} g <Text style={styles.fitUnit}>of {target.carbTarget} g target</Text></Text><CarbSpeedBar fast={meal.macros.fastCarbs} medium={meal.macros.mediumCarbs} slow={meal.macros.slowCarbs} /></View>
    <Text style={styles.sectionTitle}>Why it scored this way</Text>
    {meal.score.components.map((component) => <View key={component.id} style={styles.component}><View style={[styles.status, component.status === "excellent" ? styles.excellent : component.status === "good" ? styles.good : styles.adjust]} /><View style={styles.componentCopy}><View style={styles.componentTop}><Text style={styles.componentTitle}>{component.label}</Text><Text style={styles.componentScore}>{component.score}/{component.maxScore}</Text></View><Text style={styles.componentText}>{component.detail}</Text></View></View>)}
    <TouchableOpacity style={styles.fix} onPress={() => navigation.navigate("FixMeal", { mealId: meal.id })}><View><Text style={styles.fixTitle}>Fix my meal</Text><Text style={styles.fixText}>Make the smallest changes for a better fit.</Text></View><Ionicons name="arrow-forward" size={19} color={strictlyColors.ink} /></TouchableOpacity>
    <TouchableOpacity style={styles.share} onPress={() => navigation.navigate("ShareFuel", { mealId: meal.id })}><Ionicons name="share-outline" size={18} color={strictlyColors.white} /><Text style={styles.shareText}>Share your fuel</Text></TouchableOpacity>
    {meal.isEstimate ? <Text style={styles.disclaimer}>Estimated values came from a photograph. Confirmed foods and measured quantities produce more reliable nutrition totals. Strictly Score reflects workout-fueling suitability, not overall health or medical advice.</Text> : <Text style={styles.disclaimer}>Strictly Score reflects workout-fueling suitability for this session and timing window, not overall health or medical advice.</Text>}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  missing: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft },
  photo: { width: "100%", height: 220, borderRadius: strictlyRadius.large, marginBottom: 12 },
  scoreCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.large },
  scoreCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: strictlyColors.ink, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.white, fontSize: 29, lineHeight: 31 },
  scoreOut: { fontFamily: strictlyType.mono, color: strictlyColors.sage, fontSize: 8 },
  scoreCopy: { flex: 1 },
  scoreTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 24, letterSpacing: -0.6 },
  scoreText: { fontFamily: strictlyType.sans, color: strictlyColors.ink, fontSize: 12, lineHeight: 18, marginTop: 5 },
  fit: { padding: 17, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, marginTop: 12 },
  fitLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.2 },
  fitText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 17, marginTop: 8 },
  fitCarbs: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 28, marginTop: 7, marginBottom: 12 },
  fitUnit: { fontFamily: strictlyType.sans, fontWeight: "400", color: strictlyColors.textSoft, fontSize: 11 },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 18, marginTop: 25, marginBottom: 9 },
  component: { flexDirection: "row", gap: 11, padding: 14, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, marginBottom: 8 },
  status: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  excellent: { backgroundColor: strictlyColors.good },
  good: { backgroundColor: "#D5B548" },
  adjust: { backgroundColor: strictlyColors.clay },
  componentCopy: { flex: 1 },
  componentTop: { flexDirection: "row", justifyContent: "space-between" },
  componentTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 13 },
  componentScore: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9 },
  componentText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 5 },
  fix: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 17, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.large, marginTop: 13 },
  fixTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 16 },
  fixText: { fontFamily: strictlyType.sans, color: strictlyColors.ink, fontSize: 10, marginTop: 3 },
  share: { height: 54, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.medium, marginTop: 9 },
  shareText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.white },
  disclaimer: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 12 },
});

