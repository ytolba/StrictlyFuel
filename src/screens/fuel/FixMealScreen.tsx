import React, { useMemo } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { suggestMealFixes } from "../../logic/mealScore";
import { calculateMealMacros } from "../../logic/nutritionEngine";
import { scoreMeal } from "../../logic/mealScore";
import { FUEL_FOODS } from "../../data/fuelFoods";
import { saveMeal } from "../../services/fuelService";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function FixMealScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { meals, workout, target, setIngredients, buildMeal } = useFuel();
  const meal = meals.find((item) => item.id === route.params?.mealId) || meals[0];
  const fixes = useMemo(() => meal && workout && target ? suggestMealFixes(meal.ingredients, meal.macros, target, workout) : [], [meal, target, workout]);
  if (!meal || !workout || !target) return <ScreenShell title="Fix my meal" back onBack={() => navigation.goBack()}><Text>Meal unavailable.</Text></ScreenShell>;

  let projected = meal.ingredients.map((item) => ({ ...item }));
  fixes.forEach((fix) => {
    if (fix.action === "add") {
      const food = FUEL_FOODS.find((item) => item.name === fix.ingredientName);
      if (food) projected.push({ id: `fix-${food.id}-${Date.now()}`, food, grams: fix.grams });
    } else {
      const index = projected.findIndex((item) => item.food.name === fix.ingredientName);
      if (index >= 0) projected[index] = { ...projected[index], grams: Math.max(1, projected[index].grams - fix.grams) };
    }
  });
  const projectedMacros = calculateMealMacros(projected);
  const projectedScore = scoreMeal(projectedMacros, target, workout);

  const apply = () => {
    if (!fixes.length) return Alert.alert("Already in a strong range", "No clear minimal adjustment is needed for this meal.");
    setIngredients(projected);
    const next = buildMeal(user?.uid || "local", `${meal.name} · adjusted`, meal.source, { ingredients: projected, imageUri: meal.imageUri, isEstimate: meal.isEstimate, confidence: meal.confidence });
    if (!next) return;
    if (user?.uid) saveMeal(user.uid, next).catch(() => undefined);
    navigation.replace("MealAnalysis", { mealId: next.id });
  };

  return <ScreenShell title="Fix my meal" eyebrow="SMALLEST USEFUL CHANGES" back onBack={() => navigation.goBack()}>
    <View style={styles.scoreChange}><View><Text style={styles.scoreLabel}>CURRENT</Text><Text style={styles.oldScore}>{meal.score.total}</Text></View><Ionicons name="arrow-forward" size={24} color={strictlyColors.textSoft} /><View><Text style={styles.scoreLabel}>AFTER FIX</Text><Text style={styles.newScore}>{projectedScore.total}</Text></View></View>
    <Text style={styles.intro}>Keep the meal you planned. These changes move it closer to your {target.carbTarget} g target and {workout.startsInMinutes}-minute digestion window.</Text>
    {fixes.length ? fixes.map((fix) => <View key={fix.id} style={styles.fix}><View style={[styles.sign, fix.action === "reduce" && styles.minus]}><Text style={styles.signText}>{fix.action === "add" ? "+" : "−"}</Text></View><View style={styles.fixCopy}><Text style={styles.fixTitle}>{fix.action === "add" ? "Add" : "Reduce"} {fix.ingredientName}</Text><Text style={styles.fixAmount}>{fix.grams} g adjustment</Text><Text style={styles.fixDetail}>{fix.detail}</Text></View></View>) : <View style={styles.already}><Ionicons name="checkmark-circle" size={24} color={strictlyColors.good} /><Text style={styles.alreadyText}>This meal is already close enough that Strictly does not have a confident minimal fix.</Text></View>}
    <View style={styles.preview}><Text style={styles.previewLabel}>PROJECTED MEAL</Text><View style={styles.previewRow}><Text style={styles.previewName}>Carbohydrates</Text><Text style={styles.previewValue}>{Math.round(projectedMacros.carbs)} g</Text></View><View style={styles.previewRow}><Text style={styles.previewName}>Fat</Text><Text style={styles.previewValue}>{Math.round(projectedMacros.fat)} g</Text></View><View style={styles.previewRow}><Text style={styles.previewName}>Fiber</Text><Text style={styles.previewValue}>{Math.round(projectedMacros.fiber)} g</Text></View></View>
    <TouchableOpacity style={[styles.apply, !fixes.length && styles.disabled]} disabled={!fixes.length} onPress={apply}><Text style={styles.applyText}>Apply these changes</Text><Ionicons name="checkmark" size={19} color={strictlyColors.ink} /></TouchableOpacity>
    <TouchableOpacity style={styles.keep} onPress={() => navigation.goBack()}><Text style={styles.keepText}>Keep my original meal</Text></TouchableOpacity>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  scoreChange: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: 20, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large },
  scoreLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1, textAlign: "center" },
  oldScore: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.textSoft, fontSize: 37, textAlign: "center", marginTop: 4 },
  newScore: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 37, textAlign: "center", marginTop: 4 },
  intro: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20, marginVertical: 18 },
  fix: { flexDirection: "row", gap: 12, padding: 16, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, marginBottom: 9 },
  sign: { width: 36, height: 36, borderRadius: 18, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  minus: { backgroundColor: "#F4D7CE" },
  signText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 20 },
  fixCopy: { flex: 1 },
  fixTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 14 },
  fixAmount: { fontFamily: strictlyType.mono, color: strictlyColors.ink, fontSize: 9, marginTop: 4 },
  fixDetail: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 6 },
  already: { flexDirection: "row", gap: 10, padding: 16, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large },
  alreadyText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18 },
  preview: { padding: 16, backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.large, marginTop: 13 },
  previewLabel: { fontFamily: strictlyType.mono, color: strictlyColors.sage, fontSize: 8, letterSpacing: 1.2, marginBottom: 7 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  previewName: { fontFamily: strictlyType.sans, color: "#C6CEC7", fontSize: 11 },
  previewValue: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.white, fontSize: 12 },
  apply: { height: 54, backgroundColor: strictlyColors.lime, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.medium, marginTop: 14 },
  applyText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink },
  disabled: { opacity: 0.4 },
  keep: { height: 48, alignItems: "center", justifyContent: "center" },
  keepText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 12 },
});

