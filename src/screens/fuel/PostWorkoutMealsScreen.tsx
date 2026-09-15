import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { useFuel } from "../../contexts/FuelContext";
import { useSubscription } from "../../provider/RevenuCatProvider";
import { fetchRecoveryMealTemplates } from "../../services/recoveryMealService";
import { loadNutritionProfile } from "../../services/nutritionProfileService";
import { appleHealthSupported, isAppleHealthConnected, loadTodayHealthWorkouts, refreshHealthWhenAppBecomesActive, type HealthWorkout } from "../../services/appleHealthService";
import { EMPTY_NUTRITION_PROFILE, type NutritionProfile } from "../../types/nutritionProfile";
import type { RecoveryMealTemplate, RecoveryWindow } from "../../types/recovery";
import type { WorkoutDraft, WorkoutIntensity } from "../../types/fuel";
import { calculateRecoveryTarget, formatRecoveryPortion, rankRecoveryMeals } from "../../logic/recoveryNutrition";
import { formatDuration } from "../../logic/mealTiming";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const WINDOWS: Array<{ id: RecoveryWindow; label: string; detail: string }> = [
  { id: "standard", label: "Tomorrow or later", detail: "Normal recovery" },
  { id: "same_day", label: "Later today", detail: "Another session within 8 hours" },
  { id: "rapid", label: "Within 4 hours", detail: "Rapid recovery" },
];
const activityName = (value: string) => value.replace(/_/g, " ");
const workoutTime = (value: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default function PostWorkoutMealsScreen({ navigation }: any) {
  const { workout: plannedWorkout } = useFuel();
  const { isPro, ready } = useSubscription();
  const [window, setWindow] = useState<RecoveryWindow>("standard");
  const [healthIntensity, setHealthIntensity] = useState<WorkoutIntensity>("moderate");
  const [profile, setProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);
  const [templates, setTemplates] = useState<RecoveryMealTemplate[]>([]);
  const [todayWorkouts, setTodayWorkouts] = useState<HealthWorkout[]>([]);
  const [selectedHealthId, setSelectedHealthId] = useState<string>();
  const [healthConnected, setHealthConnected] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);
  const [expanded, setExpanded] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadNutritionProfile(), fetchRecoveryMealTemplates()])
      .then(([nextProfile, nextTemplates]) => {
        if (!cancelled) { setProfile(nextProfile); setTemplates(nextTemplates); }
      })
      .finally(() => { if (!cancelled) setContentLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const refreshHealth = async () => {
      if (!ready || !isPro || !appleHealthSupported()) return;
      setHealthLoading(true);
      try {
        const connected = await isAppleHealthConnected();
        if (cancelled) return;
        setHealthConnected(connected);
        if (!connected) { setTodayWorkouts([]); return; }
        const today = await loadTodayHealthWorkouts(new Date(), 50);
        if (cancelled) return;
        setTodayWorkouts(today);
        setSelectedHealthId((current) => current && today.some((item) => item.id === current) ? current : today[0]?.id);
      } catch {
        if (!cancelled) setTodayWorkouts([]);
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    };
    refreshHealth();
    const subscription = refreshHealthWhenAppBecomesActive(refreshHealth);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isPro, ready]));

  const selectedHealthWorkout = useMemo(
    () => todayWorkouts.find((item) => item.id === selectedHealthId) || todayWorkouts[0],
    [selectedHealthId, todayWorkouts],
  );

  const recoveryWorkout = useMemo<WorkoutDraft | null>(() => {
    const bodyWeightKg = profile.bodyWeightKg || plannedWorkout?.bodyWeightKg;
    if (!bodyWeightKg) return null;
    if (selectedHealthWorkout) return {
      id: `recovery-${selectedHealthWorkout.id}`,
      activityType: selectedHealthWorkout.activityType,
      durationMinutes: selectedHealthWorkout.durationMinutes,
      intensity: healthIntensity,
      startsInMinutes: 0,
      bodyWeightKg,
      heartRateZones: [],
      completedWorkout: {
        source: "apple_health", id: selectedHealthWorkout.id, completedAt: selectedHealthWorkout.endDate,
        sourceName: selectedHealthWorkout.sourceName, distanceKm: selectedHealthWorkout.distanceKm,
        activeCalories: selectedHealthWorkout.activeCalories, averageHeartRate: selectedHealthWorkout.averageHeartRate,
        maxHeartRate: selectedHealthWorkout.maxHeartRate,
      },
      createdAt: selectedHealthWorkout.endDate,
    };
    if (!plannedWorkout) return null;
    return { ...plannedWorkout, bodyWeightKg, completedWorkout: undefined };
  }, [healthIntensity, plannedWorkout, profile.bodyWeightKg, selectedHealthWorkout]);

  const target = useMemo(() => recoveryWorkout ? calculateRecoveryTarget(recoveryWorkout, window) : null, [recoveryWorkout, window]);
  const recommendations = useMemo(
    () => recoveryWorkout ? rankRecoveryMeals(templates, { workout: recoveryWorkout, window, profile }).slice(0, 5) : [],
    [profile, recoveryWorkout, templates, window],
  );

  if (!ready) return <ScreenShell title="Post Workout" eyebrow="RECOVERY"><LoadingState title="Getting recovery ready" messages={["Checking your access", "Loading your session"]} /></ScreenShell>;

  if (!isPro) return <ScreenShell title="Post Workout" eyebrow="STRICTLY PRO">
    <View style={styles.lockedHero}>
      <View style={styles.lockIcon}><Ionicons name="lock-closed" size={25} color={strictlyColors.onLime} /></View>
      <Text style={styles.lockedTitle}>Recovery built from the work you did.</Text>
      <Text style={styles.lockedText}>Post Workout turns today’s Apple Health session, or the workout you planned in Strictly, into a practical carb and protein target with complete meal ideas.</Text>
      <View style={styles.benefits}>{["Automatic workout context", "Personal macro targets", "Complete meals scaled to you"].map((item) => <View key={item} style={styles.benefit}><Ionicons name="checkmark-circle" size={17} color={strictlyColors.good} /><Text style={styles.benefitText}>{item}</Text></View>)}</View>
      <TouchableOpacity style={styles.unlock} onPress={() => navigation.getParent()?.navigate("Paywall")}><Text style={styles.unlockText}>Unlock Post Workout</Text><Ionicons name="arrow-forward" size={17} color={strictlyColors.onLime} /></TouchableOpacity>
    </View>
  </ScreenShell>;

  if (contentLoading || healthLoading) return <ScreenShell title="Post Workout" eyebrow="RECOVERY"><LoadingState title="Building your recovery plan" messages={["Checking today’s workout", "Setting your macro target", "Scaling complete meals"]} /></ScreenShell>;

  if (!recoveryWorkout || !target) return <ScreenShell title="Post Workout" eyebrow="RECOVERY">
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Ionicons name="fitness-outline" size={24} color={strictlyColors.accentText} /></View>
      <Text style={styles.emptyTitle}>{profile.bodyWeightKg ? "Add a session first" : "Add your body weight"}</Text>
      <Text style={styles.emptyText}>{profile.bodyWeightKg ? "No Apple Health workout was found today and there is no session on Today yet. Enter your workout and this tab will use it automatically." : "Add your body weight once so Strictly can calculate a useful recovery target."}</Text>
      <TouchableOpacity style={styles.emptyAction} onPress={() => profile.bodyWeightKg ? navigation.navigate("Home") : navigation.getParent()?.navigate("Settings")}><Text style={styles.emptyActionText}>{profile.bodyWeightKg ? "Set today’s session" : "Add weight"}</Text><Ionicons name="arrow-forward" size={16} color={strictlyColors.onLime} /></TouchableOpacity>
    </View>
  </ScreenShell>;

  const fromHealth = Boolean(selectedHealthWorkout);
  const kidneyContext = profile.conditions.includes("kidney");

  return <ScreenShell title="Post Workout" eyebrow="RECOVER FROM TODAY">
    <Text style={styles.intro}>A practical meal target based on the session you completed, with clear macro ranges and meals that feel like real food.</Text>

    {todayWorkouts.length > 1 ? <View style={styles.sessionPicker}>
      <Text style={styles.sessionPickerLabel}>TODAY’S WORKOUT</Text>
      {todayWorkouts.map((item) => {
        const selected = item.id === selectedHealthWorkout?.id;
        return <TouchableOpacity key={item.id} style={[styles.sessionOption, selected && styles.sessionOptionActive]} onPress={() => setSelectedHealthId(item.id)}><View style={styles.sessionOptionCopy}><Text style={[styles.sessionOptionTitle, selected && styles.sessionOptionTitleActive]}>{item.activityLabel}</Text><Text style={[styles.sessionOptionMeta, selected && styles.sessionOptionMetaActive]}>{formatDuration(item.durationMinutes)} · ended {workoutTime(item.endDate)}</Text></View><Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={19} color={selected ? strictlyColors.onLime : strictlyColors.textSoft} /></TouchableOpacity>;
      })}
    </View> : null}

    <View style={styles.actualWorkout}>
      <View style={[styles.actualIcon, !fromHealth && styles.actualIconManual]}><Ionicons name={fromHealth ? "heart-outline" : "create-outline"} size={17} color={fromHealth ? strictlyColors.accentText : strictlyColors.onLime} /></View>
      <View style={styles.actualCopy}>
        <Text style={styles.actualEyebrow}>{fromHealth ? `APPLE HEALTH · ${selectedHealthWorkout?.sourceName || "WORKOUT"}` : "YOUR SESSION · MANUAL FALLBACK"}</Text>
        <Text style={styles.actualTitle}>{recoveryWorkout.durationMinutes} min {activityName(recoveryWorkout.activityType)}</Text>
        <View style={styles.actualMetrics}>
          {fromHealth ? <Text style={styles.actualMetric}>ended {workoutTime(selectedHealthWorkout!.endDate)}</Text> : <Text style={styles.actualMetric}>{recoveryWorkout.intensity} effort</Text>}
          {selectedHealthWorkout?.averageHeartRate ? <Text style={styles.actualMetric}>avg {Math.round(selectedHealthWorkout.averageHeartRate)} bpm</Text> : null}
          {selectedHealthWorkout?.maxHeartRate ? <Text style={styles.actualMetric}>max {Math.round(selectedHealthWorkout.maxHeartRate)} bpm</Text> : null}
          {selectedHealthWorkout?.distanceKm ? <Text style={styles.actualMetric}>{selectedHealthWorkout.distanceKm.toFixed(1)} km</Text> : null}
          {selectedHealthWorkout?.activeCalories ? <Text style={styles.actualMetric}>{Math.round(selectedHealthWorkout.activeCalories)} kcal</Text> : null}
        </View>
        {!fromHealth ? <Text style={styles.sourceNote}>No completed Apple Health workout was found today, so this plan uses the session entered on Today.</Text> : null}
      </View>
    </View>

    {fromHealth ? <View style={styles.effortBlock}><View style={styles.effortHeading}><Text style={styles.effortTitle}>How hard did it feel?</Text><Text style={styles.effortHelp}>Heart rate adds context. Your effort keeps the target personal.</Text></View><View style={styles.effortSegment}>{(["easy", "moderate", "hard"] as WorkoutIntensity[]).map((value) => <TouchableOpacity key={value} onPress={() => setHealthIntensity(value)} style={[styles.effortOption, healthIntensity === value && styles.effortOptionActive]}><Text style={[styles.effortOptionText, healthIntensity === value && styles.effortOptionTextActive]}>{value}</Text></TouchableOpacity>)}</View></View> : null}

    {!healthConnected && appleHealthSupported() ? <TouchableOpacity style={styles.connectPrompt} onPress={() => navigation.getParent()?.navigate("HealthWorkouts")}><View style={styles.connectPromptCopy}><Text style={styles.connectPromptTitle}>Want automatic workout details?</Text><Text style={styles.connectPromptText}>Connect Apple Health for future sessions.</Text></View><Ionicons name="chevron-forward" size={17} color={strictlyColors.textSoft} /></TouchableOpacity> : null}

    <Text style={styles.question}>When is your next demanding session?</Text>
    <View style={styles.windowList}>{WINDOWS.map((option) => {
      const selected = option.id === window;
      return <TouchableOpacity key={option.id} style={[styles.window, selected && styles.windowActive]} onPress={() => setWindow(option.id)} activeOpacity={0.82}><View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioDot} /> : null}</View><View style={styles.windowCopy}><Text style={[styles.windowLabel, selected && styles.windowLabelActive]}>{option.label}</Text><Text style={[styles.windowDetail, selected && styles.windowDetailActive]}>{option.detail}</Text></View></TouchableOpacity>;
    })}</View>

    <View style={styles.targetCard}>
      <Text style={styles.targetEyebrow}>{target.category.replace(/_/g, " ").toUpperCase()}</Text>
      <Text style={styles.targetHeading}>Your recovery macros</Text>
      <View style={styles.targets}>
        <View style={styles.targetColumn}><Text style={styles.targetValue}>{target.carbs}g</Text><Text style={styles.targetLabel}>CARBS</Text><Text style={styles.targetRange}>{target.carbRange[0]}–{target.carbRange[1]}g range</Text></View>
        <View style={styles.targetDivider} />
        <View style={styles.targetColumn}><Text style={styles.targetValue}>{target.protein}g</Text><Text style={styles.targetLabel}>PROTEIN</Text><Text style={styles.targetRange}>{target.proteinRange[0]}–{target.proteinRange[1]}g range</Text></View>
      </View>
      <Text style={styles.timing}>{target.timingHeadline}</Text><Text style={styles.rationale}>{target.rationale}</Text>
    </View>
    {fromHealth ? <Text style={styles.healthContextNote}>Recorded duration and energy refine the estimate. Heart rate is supporting context, not a medical measure or a substitute for your own zones.</Text> : null}
    {kidneyContext ? <View style={styles.caution}><Ionicons name="medical-outline" size={18} color={strictlyColors.clay} /><Text style={styles.cautionText}>Because you noted a kidney-related limit, treat this general protein target as informational and follow your clinician’s personalized guidance.</Text></View> : null}

    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Complete meal ideas</Text><Text style={styles.sectionMeta}>{recommendations.length} BEST FITS</Text></View>
    {recommendations.map((recommendation, index) => {
      const open = expanded === recommendation.template.id;
      return <View key={recommendation.template.id} style={[styles.mealCard, index === 0 && styles.bestCard]}>
        <View style={styles.mealHead}><View style={styles.mealCopy}><Text style={styles.mealEyebrow}>{index === 0 ? "BEST MATCH" : `${recommendation.template.cuisine.toUpperCase()} · ${recommendation.template.prepMinutes} MIN`}</Text><Text style={styles.mealName}>{recommendation.template.name}</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{recommendation.score.total}</Text></View></View>
        <Text style={styles.description}>{recommendation.template.description}</Text>
        <View style={styles.macros}><Text style={styles.macroStrong}>{Math.round(recommendation.macros.carbs)}g carbs</Text><Text style={styles.macro}>{Math.round(recommendation.macros.protein)}g protein</Text><Text style={styles.macro}>{Math.round(recommendation.macros.fat)}g fat</Text><Text style={styles.macro}>{Math.round(recommendation.macros.calories)} kcal</Text></View>
        <View style={styles.ingredients}>{recommendation.ingredients.map((item) => <View key={item.id} style={styles.ingredient}><Text style={styles.emoji}>{item.food.emoji}</Text><Text style={styles.ingredientName}>{item.food.name}</Text><Text style={styles.portion}>{formatRecoveryPortion(item)}</Text></View>)}</View>
        {recommendation.adjustmentSummary.length ? <View style={styles.scaled}><Ionicons name="resize-outline" size={15} color={strictlyColors.accentText} /><Text style={styles.scaledText}>{recommendation.adjustmentSummary.join(". ")}.</Text></View> : null}
        {open ? <View style={styles.recipe}>{recommendation.template.instructions.map((step, stepIndex) => <View key={step} style={styles.step}><Text style={styles.stepNumber}>{stepIndex + 1}</Text><Text style={styles.stepText}>{step}</Text></View>)}</View> : null}
        <TouchableOpacity style={[styles.recipeButton, index === 0 && styles.recipeButtonBest]} onPress={() => setExpanded(open ? undefined : recommendation.template.id)}><Text style={[styles.recipeButtonText, index === 0 && styles.recipeButtonTextBest]}>{open ? "Hide instructions" : "View how to make it"}</Text><Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={index === 0 ? strictlyColors.onLime : strictlyColors.text} /></TouchableOpacity>
      </View>;
    })}
    {!recommendations.length ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No safe recovery match yet</Text><Text style={styles.emptyText}>Your dietary exclusions removed the current meals. You can still build a meal manually from foods you trust.</Text></View> : null}
    <View style={styles.hydration}><Ionicons name="water-outline" size={18} color={strictlyColors.accentText} /><Text style={styles.hydrationText}>{target.hydrationNote}</Text></View>
    <Text style={styles.disclaimer}>Recovery targets are general sports-nutrition estimates, not medical advice. Daily intake, appetite, sweat losses, and the timing of your next session all matter.</Text>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  intro: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20 },
  lockedHero: { padding: 20, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  lockIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  lockedTitle: { marginTop: 19, fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 25, lineHeight: 30, letterSpacing: -0.6 },
  lockedText: { marginTop: 9, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20 },
  benefits: { gap: 11, marginTop: 20, paddingTop: 17, borderTopWidth: 1, borderTopColor: strictlyColors.border },
  benefit: { flexDirection: "row", alignItems: "center", gap: 9 }, benefitText: { flex: 1, fontFamily: strictlyType.medium, color: strictlyColors.text, fontSize: 12 },
  unlock: { height: 54, marginTop: 21, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, unlockText: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 13 },
  sessionPicker: { gap: 7, marginTop: 15 }, sessionPickerLabel: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1, marginBottom: 2 },
  sessionOption: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, sessionOptionActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime },
  sessionOptionCopy: { flex: 1, minWidth: 0 }, sessionOptionTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 12 }, sessionOptionTitleActive: { color: strictlyColors.onLime }, sessionOptionMeta: { marginTop: 3, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11 }, sessionOptionMetaActive: { color: strictlyColors.onLimeSoft },
  actualWorkout: { flexDirection: "row", gap: 11, padding: 14, marginTop: 15, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  actualIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted, borderWidth: 1, borderColor: strictlyColors.border }, actualIconManual: { backgroundColor: strictlyColors.lime }, actualCopy: { flex: 1, minWidth: 0 },
  actualEyebrow: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1 }, actualTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 15, lineHeight: 20, marginTop: 4, textTransform: "capitalize" },
  actualMetrics: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }, actualMetric: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: strictlyRadius.pill, overflow: "hidden", backgroundColor: strictlyColors.cream, fontFamily: strictlyType.semibold, color: strictlyColors.text, fontSize: 11 }, sourceNote: { marginTop: 9, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14 },
  effortBlock: { padding: 14, marginTop: 9, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface }, effortHeading: { gap: 3, marginBottom: 10 }, effortTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 13 }, effortHelp: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14 },
  effortSegment: { flexDirection: "row", gap: 6 }, effortOption: { flex: 1, height: 39, borderRadius: strictlyRadius.small, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" }, effortOptionActive: { backgroundColor: strictlyColors.lime }, effortOptionText: { fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 11, textTransform: "capitalize" }, effortOptionTextActive: { color: strictlyColors.onLime, fontFamily: strictlyType.bold },
  connectPrompt: { minHeight: 62, padding: 13, marginTop: 9, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream }, connectPromptCopy: { flex: 1 }, connectPromptTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 11 }, connectPromptText: { marginTop: 3, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11 },
  question: { marginTop: 24, marginBottom: 10, fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 17 }, windowList: { gap: 8 },
  window: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, windowActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: strictlyColors.borderStrong, alignItems: "center", justifyContent: "center" }, radioActive: { borderColor: strictlyColors.onLime }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: strictlyColors.onLime },
  windowCopy: { flex: 1 }, windowLabel: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 13 }, windowLabelActive: { color: strictlyColors.onLime }, windowDetail: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, marginTop: 2 }, windowDetailActive: { color: strictlyColors.onLimeSoft },
  targetCard: { padding: 18, marginTop: 16, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.ink, borderWidth: 1, borderColor: strictlyColors.border }, targetEyebrow: { fontFamily: strictlyType.semibold, color: strictlyColors.inverseTextSoft, fontSize: 11, letterSpacing: 1.1 }, targetHeading: { marginTop: 7, fontFamily: strictlyType.bold,  color: strictlyColors.inverseText, fontSize: 17 },
  targets: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 14 }, targetColumn: { flex: 1 }, targetValue: { fontFamily: strictlyType.bold,  color: strictlyColors.inverseText, fontSize: 30 }, targetLabel: { fontFamily: strictlyType.semibold, color: strictlyColors.inverseTextSoft, fontSize: 11, marginTop: 2 }, targetRange: { marginTop: 5, fontFamily: strictlyType.regular, color: strictlyColors.inverseTextSoft, fontSize: 11 }, targetDivider: { width: 1, height: 54, backgroundColor: strictlyColors.overlayLine },
  timing: { fontFamily: strictlyType.bold,  color: strictlyColors.lime, fontSize: 12, marginTop: 17 }, rationale: { fontFamily: strictlyType.regular, color: strictlyColors.inverseTextSoft, fontSize: 11, lineHeight: 17, marginTop: 6 }, healthContextNote: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14, marginTop: 7, paddingHorizontal: 3 },
  caution: { flexDirection: "row", gap: 9, padding: 13, marginTop: 10, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.dangerSurface }, cautionText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11, lineHeight: 16 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 28, marginBottom: 11 }, sectionTitle: { flex: 1, fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 19 }, sectionMeta: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11 },
  mealCard: { padding: 16, marginBottom: 10, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, bestCard: { backgroundColor: strictlyColors.surfaceMuted, borderColor: strictlyColors.borderStrong }, mealHead: { flexDirection: "row", alignItems: "center", gap: 12 }, mealCopy: { flex: 1, minWidth: 0 }, mealEyebrow: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1 }, mealName: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 18, lineHeight: 22, marginTop: 4 },
  score: { width: 54, height: 54, flexShrink: 0, borderRadius: 27, backgroundColor: strictlyColors.good, alignItems: "center", justifyContent: "center" }, scoreValue: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 17 }, scoreLabel: { fontFamily: strictlyType.semibold, color: strictlyColors.onLime, fontSize: 11 }, description: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 10 },
  macros: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, macroStrong: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 11 }, macro: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11 },
  ingredients: { marginTop: 12, borderTopWidth: 1, borderTopColor: strictlyColors.border, paddingTop: 8 }, ingredient: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 8 }, emoji: { width: 20, fontSize: 14 }, ingredientName: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11 }, portion: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 11 },
  scaled: { flexDirection: "row", gap: 7, padding: 10, marginTop: 8, borderRadius: strictlyRadius.small, backgroundColor: strictlyColors.cream }, scaledText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11, lineHeight: 14 }, recipe: { gap: 9, marginTop: 12 }, step: { flexDirection: "row", gap: 9 }, stepNumber: { width: 20, height: 20, borderRadius: 10, backgroundColor: strictlyColors.cream, textAlign: "center", lineHeight: 20, fontFamily: strictlyType.semibold, color: strictlyColors.text, fontSize: 11 }, stepText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11, lineHeight: 16 },
  recipeButton: { height: 46, marginTop: 13, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, recipeButtonBest: { backgroundColor: strictlyColors.lime }, recipeButtonText: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 11 }, recipeButtonTextBest: { color: strictlyColors.onLime },
  emptyCard: { padding: 20, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, emptyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: strictlyColors.cream, alignItems: "center", justifyContent: "center", marginBottom: 16 }, emptyTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 17 }, emptyText: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 6 }, emptyAction: { height: 45, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 15, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime }, emptyActionText: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 11 },
  hydration: { flexDirection: "row", gap: 9, padding: 14, marginTop: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.cream }, hydrationText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11, lineHeight: 16 }, disclaimer: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14, marginTop: 13 },
});
