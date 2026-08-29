import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { analyzeMealPhoto } from "../../services/mealAnalysisService";
import { isAiLimitError } from "../../services/functionErrors";
import { validateMealNutrition } from "../../logic/nutritionEngine";
import { saveMeal } from "../../services/fuelService";
import type { MealIngredient } from "../../types/fuel";
import type { MealAnalysis } from "../../types/mealAnalysis";
import { useSubscription } from "../../provider/RevenuCatProvider";
import { SCAN_LIMITS } from "../../config/monetization";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { ValueEditorSheet } from "../../components/fuel/ValueEditorSheet";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

function detectedIngredients(analysis: MealAnalysis): MealIngredient[] {
  return analysis.items.map((item, index) => {
    const grams = Math.max(1, item.estimatedGrams || 100);
    return {
      id: `detected-${item.id}-${index}`,
      food: item.food,
      grams,
      confidence: Math.min(item.foodConfidence, item.portionConfidence, item.nutritionMatchConfidence),
      foodConfidence: item.foodConfidence,
      portionConfidence: item.portionConfidence,
      nutritionMatchConfidence: item.nutritionMatchConfidence,
      estimated: true,
    };
  });
}

export default function MealScanScreen({ navigation }: any) {
  const { user } = useAuth();
  const { target, workout, setIngredients, buildMeal } = useFuel();
  const { isPro, canScan, scansRemaining, scanLimit, consumeScan, refreshUsage } = useSubscription();
  const [photoUri, setPhotoUri] = useState<string>();
  const [base64, setBase64] = useState("");
  const [analysis, setAnalysis] = useState<MealAnalysis>();
  const [items, setItems] = useState<MealIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [editingId, setEditingId] = useState<string>();

  // Every vision call costs a scan from the weekly allowance, so a double tap
  // must not buy two. `loading` is React state and lands a frame too late.
  const visionInFlight = useRef(false);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  const estimatedCarbs = useMemo(() => items.reduce((sum, item) => sum + item.food.per100g.carbs * item.grams / 100, 0), [items]);
  const nutritionWarnings = useMemo(() => validateMealNutrition(items), [items]);

  const pick = async (source: "camera" | "library") => {
    if (!target) return Alert.alert("Set your workout first", "Strictly scores a meal against a specific workout and timing window.", [{ text: "Go to Home", onPress: () => navigation.navigate("Home") }]);
    if (!canScan) {
      return Alert.alert(
        "Weekly scans used up",
        `You've used all ${scanLimit} AI meal scans for this week. They reset Monday — or upgrade for ${SCAN_LIMITS.pro} a week.`,
        [{ text: "Not now", style: "cancel" }, { text: "See Pro", onPress: () => navigation.getParent()?.navigate("Paywall") }]
      );
    }
    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", `Allow ${source === "camera" ? "camera" : "photo library"} access to scan a meal.`);
    const result = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
    if (visionInFlight.current) return;
    visionInFlight.current = true;
    setPhotoUri(result.assets[0].uri);
    setAnalysis(undefined);
    setItems([]);
    setLoading(true);
    try {
      const prepared = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1600 } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!prepared.base64) throw new Error("The photo could not be prepared.");
      setBase64(prepared.base64);
      const next = await analyzeMealPhoto(prepared.base64, workout ? `Upcoming workout: ${workout.activityType}, ${workout.durationMinutes} minutes, starts in ${workout.startsInMinutes} minutes.` : "");
      setAnalysis(next);
      setItems(detectedIngredients(next));
      // Only count a scan that actually returned a result.
      await consumeScan();
    } catch (error: any) {
      setPhotoUri(undefined);
      if (isAiLimitError(error)) {
        await refreshUsage();
        Alert.alert("Weekly scans used up", error.message, [
          { text: "Not now", style: "cancel" },
          { text: "See Pro", onPress: () => navigation.getParent()?.navigate("Paywall") },
        ]);
      } else {
        Alert.alert("Could not read this meal", error?.message || "Try again in brighter light with the full plate visible.");
      }
    } finally {
      visionInFlight.current = false;
      setLoading(false);
    }
  };

  const refine = async () => {
    if (!base64 || !context.trim()) return;
    if (visionInFlight.current) return;
    if (!canScan) {
      return Alert.alert(
        "Weekly scans used up",
        "Refining re-reads the photo, so it uses a scan. Your allowance resets Monday.",
        [{ text: "Not now", style: "cancel" }, { text: "See Pro", onPress: () => navigation.getParent()?.navigate("Paywall") }]
      );
    }
    visionInFlight.current = true;
    setLoading(true);
    try {
      const next = await analyzeMealPhoto(base64, `User confirmed: ${context.trim()}`);
      setAnalysis(next);
      setItems(detectedIngredients(next));
      await consumeScan();
    } catch (error: any) {
      if (isAiLimitError(error)) {
        await refreshUsage();
        Alert.alert("Weekly scans used up", error.message, [
          { text: "Not now", style: "cancel" },
          { text: "See Pro", onPress: () => navigation.getParent()?.navigate("Paywall") },
        ]);
      } else {
        Alert.alert("Could not refine this estimate", error?.message || "Try again.");
      }
    }
    finally {
      visionInFlight.current = false;
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!analysis || !items.length) return;
    setIngredients(items);
    const meal = buildMeal(user?.uid || "local", analysis.mealName, "camera", { imageUri: photoUri, confidence: analysis.confidence, isEstimate: true, ingredients: items });
    if (!meal) return;
    if (user?.uid) saveMeal(user.uid, meal).catch(() => undefined);
    navigation.getParent()?.navigate("MealAnalysis", { mealId: meal.id });
  };

  return <ScreenShell title="Scan meal" eyebrow={target ? `${target.carbTarget} G TARGET` : "WORKOUT REQUIRED"}>
    {!photoUri ? <>
      <View style={styles.hero}><View style={styles.cameraCircle}><Ionicons name="camera-outline" size={31} color={strictlyColors.onLime} /></View><Text style={styles.heroTitle}>Show us your plate</Text><Text style={styles.heroText}>Include the full meal from a slight angle. A known plate size or visible package improves the estimate.</Text></View>
      <TouchableOpacity style={styles.usage} activeOpacity={0.8} onPress={() => isPro ? undefined : navigation.getParent()?.navigate("Paywall")}>
        <Ionicons name={canScan ? "flash-outline" : "lock-closed-outline"} size={15} color={canScan ? strictlyColors.lime : strictlyColors.clay} />
        <Text style={styles.usageText}>
          {isPro ? `${scansRemaining} of ${scanLimit} scans left this week` : canScan ? `${scansRemaining} of ${scanLimit} free scans left this week` : "No free scans left — resets Monday"}
        </Text>
        {!isPro ? <Text style={styles.usageLink}>{canScan ? "Go Pro" : "Upgrade"}</Text> : null}
      </TouchableOpacity>
      <TouchableOpacity style={styles.primary} onPress={() => pick("camera")}><Ionicons name="camera" size={19} color={strictlyColors.onLime} /><Text style={styles.primaryText}>Take a photo</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => pick("library")}><Ionicons name="images-outline" size={19} color={strictlyColors.text} /><Text style={styles.secondaryText}>Choose from library</Text></TouchableOpacity>
      <View style={styles.truth}><Ionicons name="shield-checkmark-outline" size={19} color={strictlyColors.text} /><Text style={styles.truthText}><Text style={styles.truthStrong}>You stay in control.</Text> Photo values are estimates. You can change portions, remove mistakes, and add missing foods before anything is logged.</Text></View>
    </> : <>
      <Image source={{ uri: photoUri }} style={styles.photo} />
      {loading ? <View style={styles.loadingCard}><LoadingState title={analysis ? "Refining your meal" : "Reading your plate"} messages={["Finding visible foods", "Estimating portions", "Checking the nutrition estimate"]} /></View> : analysis ? <>
        <View style={styles.estimateHead}><View><Text style={styles.estimateLabel}>CAMERA ESTIMATE · {analysis.confidence}% CONFIDENCE</Text><Text style={styles.estimateName}>{analysis.mealName}</Text></View><Text style={styles.estimateCarbs}>~{Math.round(estimatedCarbs)}g<Text style={styles.estimateUnit}> carbs</Text></Text></View>
        <Text style={styles.range}>Likely range: {Math.round(analysis.ranges.carbs[0])}–{Math.round(analysis.ranges.carbs[1])} g carbs. Correct the foods below before scoring.</Text>
        <View style={styles.items}>{items.map((item) => <View key={item.id} style={styles.item}><View style={styles.itemCopy}><Text style={styles.itemName}>{item.food.name}</Text><Text style={styles.itemMeta}>{item.food.servingLabel} · food {item.foodConfidence}% · portion {item.portionConfidence}%</Text><Text style={styles.sourceMeta}>{item.food.source === "ai_estimate" ? "AI nutrition fallback" : `${item.food.source.toUpperCase()} nutrition match · ${item.nutritionMatchConfidence}%`}</Text></View><TouchableOpacity style={styles.gramsButton} onPress={() => setEditingId(item.id)}><Text style={styles.grams}>{Math.round(item.grams)}g</Text><Ionicons name="create-outline" size={12} color={strictlyColors.textSoft} /></TouchableOpacity><TouchableOpacity onPress={() => setItems((current) => current.filter((row) => row.id !== item.id))}><Ionicons name="close-circle" size={21} color={strictlyColors.textSoft} /></TouchableOpacity></View>)}</View>
        <TouchableOpacity style={styles.editFoods} onPress={() => { setIngredients(items); navigation.getParent()?.navigate("BuildMeal", { suggestedName: analysis.mealName }); }}><Ionicons name="add-circle-outline" size={17} color={strictlyColors.text} /><Text style={styles.editFoodsText}>Add or replace a food</Text></TouchableOpacity>
        {nutritionWarnings.length ? <View style={styles.warning}><Ionicons name="alert-circle-outline" size={18} color={strictlyColors.clay} /><Text style={styles.warningText}>Strictly corrected an inconsistent calorie value from the matched nutrition record. Review the affected food before logging.</Text></View> : null}
        {analysis.followUpQuestion ? <View style={styles.followup}><Text style={styles.followupQuestion}>{analysis.followUpQuestion}</Text><TextInput value={context} onChangeText={setContext} placeholder="Add portion or preparation details" placeholderTextColor={strictlyColors.textSoft} style={styles.contextInput} /><TouchableOpacity disabled={!context.trim()} onPress={refine} style={[styles.refine, !context.trim() && styles.disabled]}><Text style={styles.refineText}>Refine estimate</Text></TouchableOpacity></View> : null}
        <TouchableOpacity style={styles.primary} onPress={confirm}><Text style={styles.primaryText}>Confirm foods and score</Text><Ionicons name="arrow-forward" size={18} color={strictlyColors.onLime} /></TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => { setPhotoUri(undefined); setAnalysis(undefined); setItems([]); }}><Text style={styles.secondaryText}>Retake photo</Text></TouchableOpacity>
        <Text style={styles.disclaimer}>{analysis.disclaimer} Digestion classes are practical meal-planning estimates, not direct measurements.</Text>
      </> : null}
      {editingId ? <ValueEditorSheet visible label={items.find((item) => item.id === editingId)?.food.name || "Food amount"} value={items.find((item) => item.id === editingId)?.grams || 100} presets={[50, 100, 150, 200]} onClose={() => setEditingId(undefined)} onSave={(grams) => setItems((current) => current.map((item) => item.id === editingId ? { ...item, grams } : item))} /> : null}
    </>}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  usage: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 14, marginTop: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  usageText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11 },
  usageLink: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.accentText, fontSize: 11 },
  hero: { alignItems: "center", paddingVertical: 34, paddingHorizontal: 15, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large },
  cameraCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 25, color: strictlyColors.text, marginTop: 18 },
  heroText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7, maxWidth: 300 },
  primary: { minHeight: 54, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 14 },
  primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.onLime },
  secondary: { minHeight: 52, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 8 },
  secondaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text },
  truth: { flexDirection: "row", gap: 10, padding: 14, marginTop: 18 },
  truthText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17 },
  truthStrong: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text },
  photo: { width: "100%", height: 260, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surfaceMuted },
  loadingCard: { marginTop: 12, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large },
  estimateHead: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-end", marginTop: 18 },
  estimateLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 0.8 },
  estimateName: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 21, marginTop: 6, maxWidth: 210 },
  estimateCarbs: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 25 },
  estimateUnit: { fontFamily: strictlyType.sans, fontWeight: "400", color: strictlyColors.textSoft, fontSize: 9 },
  range: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 9 },
  items: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, overflow: "hidden", marginTop: 14 },
  item: { flexDirection: "row", alignItems: "center", gap: 7, padding: 13, borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  itemCopy: { flex: 1 },
  itemName: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 13 },
  itemMeta: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, marginTop: 3 },
  sourceMeta: { fontFamily: strictlyType.mono, color: strictlyColors.muted, fontSize: 7, marginTop: 4, textTransform: "uppercase" },
  gramsButton: { minWidth: 64, height: 34, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted, paddingHorizontal: 8, borderRadius: 9 },
  grams: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 },
  editFoods: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 8, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  editFoodsText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 11 },
  warning: { flexDirection: "row", gap: 9, padding: 13, marginTop: 9, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.dangerSurface },
  warningText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 10, lineHeight: 15 },
  followup: { padding: 14, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large, marginTop: 12 },
  followupQuestion: { fontFamily: strictlyType.sansMedium, color: strictlyColors.text, fontSize: 12, lineHeight: 18 },
  contextInput: { minHeight: 46, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.borderStrong, borderRadius: strictlyRadius.medium, paddingHorizontal: 12, marginTop: 9, fontFamily: strictlyType.sans, color: strictlyColors.text },
  refine: { alignItems: "center", padding: 12, backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.medium, marginTop: 8 },
  refineText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.white, fontSize: 12 },
  disabled: { opacity: 0.4 },
  disclaimer: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 11 },
});
