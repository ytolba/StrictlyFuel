import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { useFuel } from "../../contexts/FuelContext";
import { fetchRecoveryMealTemplates } from "../../services/recoveryMealService";
import { loadNutritionProfile } from "../../services/nutritionProfileService";
import { EMPTY_NUTRITION_PROFILE, type NutritionProfile } from "../../types/nutritionProfile";
import type { RecoveryMealTemplate, RecoveryWindow } from "../../types/recovery";
import { calculateRecoveryTarget, formatRecoveryPortion, rankRecoveryMeals } from "../../logic/recoveryNutrition";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const WINDOWS: Array<{ id: RecoveryWindow; label: string; detail: string }> = [
  { id: "standard", label: "Tomorrow or later", detail: "Normal recovery" },
  { id: "same_day", label: "Later today", detail: "Another session within 8 hours" },
  { id: "rapid", label: "Within 4 hours", detail: "Rapid recovery" },
];

export default function PostWorkoutMealsScreen({ navigation }: any) {
  const { workout } = useFuel();
  const [window, setWindow] = useState<RecoveryWindow>("standard");
  const [profile, setProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);
  const [templates, setTemplates] = useState<RecoveryMealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadNutritionProfile(), fetchRecoveryMealTemplates()])
      .then(([nextProfile, nextTemplates]) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setTemplates(nextTemplates);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const target = useMemo(() => workout ? calculateRecoveryTarget(workout, window) : null, [workout, window]);
  const recommendations = useMemo(
    () => workout ? rankRecoveryMeals(templates, { workout, window, profile }).slice(0, 5) : [],
    [profile, templates, window, workout],
  );

  if (!workout || !target) {
    return <ScreenShell title="Recovery meals" back onBack={() => navigation.goBack()}><Text style={styles.empty}>Calculate a workout first.</Text></ScreenShell>;
  }

  if (loading) {
    return <ScreenShell title="Recovery meals" back onBack={() => navigation.goBack()}><LoadingState title="Building a real recovery meal" messages={["Setting your carbohydrate target", "Setting a useful protein serving", "Scaling complete meals"]} /></ScreenShell>;
  }

  const kidneyContext = profile.conditions.includes("kidney");

  return (
    <ScreenShell title="After your workout" eyebrow="RECOVERY, NOT PRE-WORKOUT" back onBack={() => navigation.goBack()}>
      <Text style={styles.intro}>Complete meals for after training. Strictly adjusts the rice, potatoes, pasta, or protein already on the plate instead of adding random foods.</Text>

      <Text style={styles.question}>When is your next demanding session?</Text>
      <View style={styles.windowList}>
        {WINDOWS.map((option) => {
          const selected = option.id === window;
          return <TouchableOpacity key={option.id} style={[styles.window, selected && styles.windowActive]} onPress={() => setWindow(option.id)} activeOpacity={0.82}>
            <View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioDot} /> : null}</View>
            <View style={styles.windowCopy}><Text style={[styles.windowLabel, selected && styles.windowLabelActive]}>{option.label}</Text><Text style={[styles.windowDetail, selected && styles.windowDetailActive]}>{option.detail}</Text></View>
          </TouchableOpacity>;
        })}
      </View>

      <View style={styles.targetCard}>
        <Text style={styles.targetEyebrow}>{target.category.replace(/_/g, " ").toUpperCase()}</Text>
        <View style={styles.targets}>
          <View><Text style={styles.targetValue}>{target.carbs}g</Text><Text style={styles.targetLabel}>CARBOHYDRATE</Text></View>
          <View style={styles.targetDivider} />
          <View><Text style={styles.targetValue}>{target.protein}g</Text><Text style={styles.targetLabel}>PROTEIN</Text></View>
        </View>
        <Text style={styles.timing}>{target.timingHeadline}</Text>
        <Text style={styles.rationale}>{target.rationale}</Text>
      </View>

      {kidneyContext ? <View style={styles.caution}><Ionicons name="medical-outline" size={18} color={strictlyColors.clay} /><Text style={styles.cautionText}>Because you noted a kidney-related limit, treat this general protein target as informational and follow your clinician’s personalized guidance.</Text></View> : null}

      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Meals that actually make sense</Text><Text style={styles.sectionMeta}>{recommendations.length} best fits</Text></View>
      {recommendations.map((recommendation, index) => {
        const open = expanded === recommendation.template.id;
        return <View key={recommendation.template.id} style={[styles.mealCard, index === 0 && styles.bestCard]}>
          <View style={styles.mealHead}>
            <View style={styles.mealCopy}><Text style={styles.mealEyebrow}>{index === 0 ? "BEST MATCH" : `${recommendation.template.cuisine.toUpperCase()} · ${recommendation.template.prepMinutes} MIN`}</Text><Text style={styles.mealName}>{recommendation.template.name}</Text></View>
            <View style={styles.score}><Text style={styles.scoreValue}>{recommendation.score.total}</Text><Text style={styles.scoreLabel}>RECOVERY</Text></View>
          </View>
          <Text style={styles.description}>{recommendation.template.description}</Text>
          <View style={styles.macros}>
            <Text style={styles.macroStrong}>{Math.round(recommendation.macros.carbs)}g carbs</Text>
            <Text style={styles.macro}>{Math.round(recommendation.macros.protein)}g protein</Text>
            <Text style={styles.macro}>{Math.round(recommendation.macros.fat)}g fat</Text>
          </View>
          <View style={styles.ingredients}>
            {recommendation.ingredients.map((item) => <View key={item.id} style={styles.ingredient}><Text style={styles.emoji}>{item.food.emoji}</Text><Text style={styles.ingredientName}>{item.food.name}</Text><Text style={styles.portion}>{formatRecoveryPortion(item)}</Text></View>)}
          </View>
          {recommendation.adjustmentSummary.length ? <View style={styles.scaled}><Ionicons name="resize-outline" size={15} color={strictlyColors.accentText} /><Text style={styles.scaledText}>{recommendation.adjustmentSummary.join(". ")}.</Text></View> : null}
          {open ? <View style={styles.recipe}>{recommendation.template.instructions.map((step, stepIndex) => <View key={step} style={styles.step}><Text style={styles.stepNumber}>{stepIndex + 1}</Text><Text style={styles.stepText}>{step}</Text></View>)}</View> : null}
          <TouchableOpacity style={[styles.recipeButton, index === 0 && styles.recipeButtonBest]} onPress={() => setExpanded(open ? undefined : recommendation.template.id)}><Text style={[styles.recipeButtonText, index === 0 && styles.recipeButtonTextBest]}>{open ? "Hide instructions" : "View how to make it"}</Text><Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={index === 0 ? strictlyColors.onLime : strictlyColors.text} /></TouchableOpacity>
        </View>;
      })}

      {!recommendations.length ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No safe recovery match yet</Text><Text style={styles.emptyText}>Your dietary exclusions removed the current meals. You can still build a meal manually from foods you trust.</Text></View> : null}

      <View style={styles.hydration}><Ionicons name="water-outline" size={18} color={strictlyColors.accentText} /><Text style={styles.hydrationText}>{target.hydrationNote}</Text></View>
      <Text style={styles.disclaimer}>Recovery targets are general sports-nutrition estimates, not medical advice. Daily intake, appetite, sweat losses, and the timing of your next session all matter.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft },
  intro: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20 },
  question: { marginTop: 24, marginBottom: 10, fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 17 },
  windowList: { gap: 8 },
  window: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  windowActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: strictlyColors.borderStrong, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: strictlyColors.onLime },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: strictlyColors.onLime },
  windowCopy: { flex: 1 },
  windowLabel: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 13 },
  windowLabelActive: { color: strictlyColors.onLime },
  windowDetail: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, marginTop: 2 },
  windowDetailActive: { color: strictlyColors.onLimeSoft },
  targetCard: { padding: 18, marginTop: 16, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.ink },
  targetEyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.inverseTextSoft, fontSize: 8, letterSpacing: 1.1 },
  targets: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 13 },
  targetValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.inverseText, fontSize: 30 },
  targetLabel: { fontFamily: strictlyType.mono, color: strictlyColors.inverseTextSoft, fontSize: 7, marginTop: 2 },
  targetDivider: { width: 1, height: 42, backgroundColor: strictlyColors.overlayLine },
  timing: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.lime, fontSize: 12, marginTop: 16 },
  rationale: { fontFamily: strictlyType.sans, color: strictlyColors.inverseTextSoft, fontSize: 11, lineHeight: 17, marginTop: 6 },
  caution: { flexDirection: "row", gap: 9, padding: 13, marginTop: 10, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.dangerSurface },
  cautionText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 10, lineHeight: 16 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 28, marginBottom: 11 },
  sectionTitle: { flex: 1, fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 19 },
  sectionMeta: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8 },
  mealCard: { padding: 16, marginBottom: 10, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  bestCard: { backgroundColor: strictlyColors.surfaceMuted, borderColor: strictlyColors.borderStrong },
  mealHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealCopy: { flex: 1 },
  mealEyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, letterSpacing: 0.9 },
  mealName: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 18, lineHeight: 22, marginTop: 4 },
  score: { width: 54, height: 54, borderRadius: 27, backgroundColor: strictlyColors.good, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 17 },
  scoreLabel: { fontFamily: strictlyType.mono, color: strictlyColors.onLime, fontSize: 5 },
  description: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 10 },
  macros: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  macroStrong: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 11 },
  macro: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9 },
  ingredients: { marginTop: 12, borderTopWidth: 1, borderTopColor: strictlyColors.border, paddingTop: 8 },
  ingredient: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 8 },
  emoji: { width: 20, fontSize: 14 },
  ingredientName: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 11 },
  portion: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 10 },
  scaled: { flexDirection: "row", gap: 7, padding: 10, marginTop: 8, borderRadius: strictlyRadius.small, backgroundColor: strictlyColors.cream },
  scaledText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 9, lineHeight: 14 },
  recipe: { gap: 9, marginTop: 12 },
  step: { flexDirection: "row", gap: 9 },
  stepNumber: { width: 20, height: 20, borderRadius: 10, backgroundColor: strictlyColors.cream, textAlign: "center", lineHeight: 20, fontFamily: strictlyType.mono, color: strictlyColors.text, fontSize: 8 },
  stepText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 10, lineHeight: 16 },
  recipeButton: { height: 46, marginTop: 13, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  recipeButtonBest: { backgroundColor: strictlyColors.lime },
  recipeButtonText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 11 },
  recipeButtonTextBest: { color: strictlyColors.onLime },
  emptyCard: { padding: 20, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  emptyTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 15 },
  emptyText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 5 },
  hydration: { flexDirection: "row", gap: 9, padding: 14, marginTop: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.cream },
  hydrationText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 10, lineHeight: 16 },
  disclaimer: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 13 },
});
