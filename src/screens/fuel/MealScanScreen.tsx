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
import { householdAmountToGrams } from "../../logic/householdMeasures";
import { saveMeal } from "../../services/fuelService";
import type { MealIngredient } from "../../types/fuel";
import type { MealAnalysis } from "../../types/mealAnalysis";
import { useSubscription } from "../../provider/RevenuCatProvider";
import { SCAN_LIMITS } from "../../config/monetization";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { ValueEditorSheet } from "../../components/fuel/ValueEditorSheet";
import { PhotoCamera } from "../../components/fuel/PhotoCamera";
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
      analysisItemId: item.id,
      gramsRange: [item.portionLowerGrams, item.portionUpperGrams],
      requiresQuantityConfirmation: item.requiresQuantityConfirmation,
    };
  });
}

function portionPresets(item?: MealIngredient) {
  if (!item) return [50, 100, 150, 200];
  const name = item.food.name.toLowerCase();
  if (/\b(honey|syrup)\b/.test(name)) return [7, 14, 21, 42];
  if (/\b(peanut butter|almond butter|cashew butter|nut butter|seed butter)\b/.test(name)) return [8, 16, 32, 48];
  if (/\brice cakes?\b/.test(name)) return [9, 18, 27, 36];
  if (/\b(dry|rolled) oats?\b/.test(name)) return [10, 20, 40, 60];
  if (/\bbanana\b/.test(name)) return [59, 90, 118, 177];
  const center = Math.max(5, Math.round(item.grams));
  return [...new Set([Math.max(1, Math.round(center * 0.5)), Math.max(1, Math.round(center * 0.75)), center, Math.round(center * 1.5)])];
}

export default function MealScanScreen({ navigation }: any) {
  const { user } = useAuth();
  const { target, workout, setIngredients, buildMeal } = useFuel();
  const { isPro, canScan, scansRemaining, scanLimit, consumeScan, refreshUsage } = useSubscription();
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [pendingPhotoUris, setPendingPhotoUris] = useState<string[]>([]);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<MealAnalysis>();
  const [items, setItems] = useState<MealIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [clarificationAnswered, setClarificationAnswered] = useState(false);
  const [bestEstimateAccepted, setBestEstimateAccepted] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStage, setCameraStage] = useState<"primary" | "second">("primary");

  // Every vision call costs a scan from the weekly allowance, so a double tap
  // must not buy two. `loading` is React state and lands a frame too late.
  const visionInFlight = useRef(false);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  const estimatedCarbs = useMemo(() => items.reduce((sum, item) => sum + item.food.per100g.carbs * item.grams / 100, 0), [items]);
  const estimatedCarbRange = useMemo<[number, number]>(() => items.reduce<[number, number]>((result, item) => {
    const [low, high] = item.gramsRange || [item.grams, item.grams];
    const perGram = item.food.per100g.carbs / 100;
    result[0] += low * perGram;
    result[1] += high * perGram;
    return result;
  }, [0, 0]), [items]);
  const nutritionWarnings = useMemo(() => validateMealNutrition(items), [items]);
  const itemsNeedingConfirmation = useMemo(() => items.filter((item) => item.requiresQuantityConfirmation), [items]);

  const canBeginScan = () => {
    if (!target) return Alert.alert("Set your workout first", "Strictly scores a meal against a specific workout and timing window.", [{ text: "Go to Home", onPress: () => navigation.navigate("Home") }]);
    if (!canScan) {
      return Alert.alert(
        "Weekly scans used up",
        `You've used all ${scanLimit} AI meal scans for this week. They reset Monday — or upgrade for ${SCAN_LIMITS.pro} a week.`,
        [{ text: "Not now", style: "cancel" }, { text: "See Pro", onPress: () => navigation.getParent()?.navigate("Paywall") }]
      );
    }
    return true;
  };

  const analyzePhotos = async (uris: string[]) => {
    if (visionInFlight.current) return;
    visionInFlight.current = true;
    const selectedUris = uris.filter(Boolean).slice(0, 2);
    setCameraOpen(false);
    setPendingPhotoUris([]);
    setPhotoUris(selectedUris);
    setPhotoUri(selectedUris[0]);
    setAnalysis(undefined);
    setItems([]);
    setContext("");
    setClarificationAnswered(false);
    setBestEstimateAccepted(false);
    setLoading(true);
    try {
      const prepared = await Promise.all(selectedUris.map((uri) => ImageManipulator.manipulateAsync(uri, [{ resize: { width: 2048 } }], { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG, base64: true })));
      const encoded = prepared.map((image) => image.base64 || "").filter(Boolean);
      if (encoded.length !== selectedUris.length) throw new Error("The photos could not be prepared.");
      setBase64Images(encoded);
      const next = await analyzeMealPhoto(encoded, workout ? `Upcoming workout: ${workout.activityType}, ${workout.durationMinutes} minutes, starts in ${workout.startsInMinutes} minutes.` : "");
      setAnalysis(next);
      setItems(detectedIngredients(next));
      // Only count a scan that actually returned a result.
      await consumeScan();
    } catch (error: any) {
      setPhotoUri(undefined);
      setPhotoUris([]);
      setBase64Images([]);
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

  const handleCameraCapture = async (uri: string) => {
    if (cameraStage === "second" && pendingPhotoUris[0]) return analyzePhotos([pendingPhotoUris[0], uri]);
    setPendingPhotoUris([uri]);
    setCameraOpen(false);
  };
  const openCamera = () => {
    if (canBeginScan() !== true) return;
    setPendingPhotoUris([]);
    setCameraStage("primary");
    setCameraOpen(true);
  };
  const addSecondAngle = () => { setCameraStage("second"); setCameraOpen(true); };
  const pickLibrary = async () => {
    if (canBeginScan() !== true) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", "Allow photo library access to scan a meal.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsMultipleSelection: true, selectionLimit: 2 });
    if (result.canceled) return;
    const uris = result.assets.map((asset) => asset.uri).slice(0, 2);
    if (uris.length > 1) await analyzePhotos(uris);
    else setPendingPhotoUris(uris);
  };

  const refine = async () => {
    if (!base64Images.length || !context.trim()) return;
    if (visionInFlight.current) return;
    visionInFlight.current = true;
    setLoading(true);
    try {
      const uncertainId = analysis?.uncertainItemIds?.[0];
      const uncertainItem = uncertainId
        ? analysis?.items.find((item) => item.id === uncertainId)
        : analysis?.items.length === 1 ? analysis.items[0] : undefined;
      const converted = uncertainItem ? householdAmountToGrams(uncertainItem.name, context.trim()) : null;
      if (analysis && uncertainItem && converted) {
        const nextItems = analysis.items.map((item) => item.id === uncertainItem.id
          ? { ...item, estimatedGrams: converted.grams, portionLowerGrams: converted.grams, portionUpperGrams: converted.grams, portionBasis: "user" as const, portionDescription: context.trim(), portionConfidence: Math.max(item.portionConfidence, 96), requiresQuantityConfirmation: false, quantityQuestion: "", quantityOptions: [] }
          : item);
        const remaining = nextItems.filter((item) => item.requiresQuantityConfirmation || item.foodConfidence < 70 || item.portionConfidence < 65);
        const nextUncertain = remaining[0];
        const next = { ...analysis, items: nextItems, needsUserInput: remaining.length > 0, followUpQuestion: nextUncertain?.quantityQuestion || "", followUpOptions: nextUncertain?.quantityOptions || [], uncertainItemIds: remaining.map((item) => item.id), confidence: remaining.length ? analysis.confidence : Math.max(analysis.confidence, 88) };
        setAnalysis(next);
        setItems(detectedIngredients(next));
        setClarificationAnswered(true);
        return;
      }
      const workoutContext = workout ? `Upcoming workout: ${workout.activityType}, ${workout.durationMinutes} minutes, starts in ${workout.startsInMinutes} minutes. ` : "";
      const next = await analyzeMealPhoto(base64Images, `${workoutContext}User confirmed: ${context.trim()}`, analysis?.refinementToken || "");
      setAnalysis(next);
      setItems(detectedIngredients(next));
      setClarificationAnswered(true);
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

  const acceptBestEstimate = () => {
    const acceptedItems = items.map((item) => ({ ...item, requiresQuantityConfirmation: false }));
    setItems(acceptedItems);
    setAnalysis((current) => current ? {
      ...current,
      needsUserInput: false,
      followUpQuestion: "",
      followUpOptions: [],
      uncertainItemIds: [],
    } : current);
    setContext("");
    setBestEstimateAccepted(true);
    return acceptedItems;
  };

  const finalizeMeal = (finalItems: MealIngredient[]) => {
    if (!analysis || !finalItems.length) return;
    setIngredients(finalItems);
    const meal = buildMeal(user?.uid || "local", analysis.mealName, "camera", { imageUri: photoUri, confidence: analysis.confidence, isEstimate: true, ingredients: finalItems });
    if (!meal) return;
    if (user?.uid) saveMeal(user.uid, meal).catch(() => undefined);
    navigation.getParent()?.navigate("MealAnalysis", { mealId: meal.id });
  };

  const confirm = () => {
    if (!analysis || !items.length) return;
    finalizeMeal(itemsNeedingConfirmation.length ? acceptBestEstimate() : items);
  };

  const saveEditedAmount = (grams: number) => {
    const edited = items.find((item) => item.id === editingId);
    setItems((current) => current.map((item) => item.id === editingId ? { ...item, grams, gramsRange: [grams, grams], requiresQuantityConfirmation: false, portionConfidence: 100, confidence: Math.min(item.foodConfidence || 100, item.nutritionMatchConfidence || 100) } : item));
    if (!edited?.analysisItemId) return;
    setAnalysis((current) => {
      if (!current) return current;
      const nextItems = current.items.map((item) => item.id === edited.analysisItemId
        ? { ...item, estimatedGrams: grams, portionLowerGrams: grams, portionUpperGrams: grams, portionBasis: "user" as const, portionConfidence: 100, requiresQuantityConfirmation: false, quantityQuestion: "", quantityOptions: [] }
        : item);
      const remaining = nextItems.filter((item) => item.requiresQuantityConfirmation || item.foodConfidence < 70 || item.portionConfidence < 65);
      const nextUncertain = remaining[0];
      return { ...current, items: nextItems, needsUserInput: remaining.length > 0, followUpQuestion: nextUncertain?.quantityQuestion || "", followUpOptions: nextUncertain?.quantityOptions || [], uncertainItemIds: remaining.map((item) => item.id) };
    });
  };

  return <ScreenShell title="Scan meal" eyebrow={target ? `${target.carbTarget} G TARGET` : "WORKOUT REQUIRED"}>
    {cameraOpen ? <PhotoCamera hint={cameraStage === "second" ? "Take a lower side angle of the same plate" : "Capture the full plate from about a 45° angle"} onCapture={handleCameraCapture} onCancel={() => setCameraOpen(false)} /> : pendingPhotoUris.length && !photoUri ? <>
      <Image source={{ uri: pendingPhotoUris[0] }} style={styles.photo} />
      <View style={styles.angleCard}><View style={styles.angleIcon}><Ionicons name="scan-outline" size={22} color={strictlyColors.onLime} /></View><View style={styles.angleCopy}><Text style={styles.angleTitle}>One more angle improves portions</Text><Text style={styles.angleText}>Take a lower side photo of the same plate. It helps Strictly see food height, spread thickness, and hidden layers.</Text></View></View>
      <TouchableOpacity style={styles.primary} onPress={addSecondAngle}><Ionicons name="camera" size={19} color={strictlyColors.onLime} /><Text style={styles.primaryText}>Add side angle</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => analyzePhotos(pendingPhotoUris)}><Text style={styles.secondaryText}>Analyze one photo</Text></TouchableOpacity>
      <TouchableOpacity style={styles.textAction} onPress={() => setPendingPhotoUris([])}><Text style={styles.textActionLabel}>Retake first photo</Text></TouchableOpacity>
    </> : !photoUri ? <>
      <View style={styles.hero}><View style={styles.cameraCircle}><Ionicons name="camera-outline" size={31} color={strictlyColors.onLime} /></View><Text style={styles.heroTitle}>Show us your plate</Text><Text style={styles.heroText}>Start at about a 45° angle. Strictly will offer a second photo because two views are much better for portion depth.</Text></View>
      <TouchableOpacity style={styles.usage} activeOpacity={0.8} onPress={() => isPro ? undefined : navigation.getParent()?.navigate("Paywall")}>
        <Ionicons name={canScan ? "flash-outline" : "lock-closed-outline"} size={15} color={canScan ? strictlyColors.lime : strictlyColors.clay} />
        <Text style={styles.usageText}>
          {isPro ? `${scansRemaining} of ${scanLimit} scans left this week` : canScan ? `${scansRemaining} of ${scanLimit} free scans left this week` : "No free scans left — resets Monday"}
        </Text>
        {!isPro ? <Text style={styles.usageLink}>{canScan ? "Go Pro" : "Upgrade"}</Text> : null}
      </TouchableOpacity>
      <TouchableOpacity style={styles.primary} onPress={openCamera}><Ionicons name="camera" size={19} color={strictlyColors.onLime} /><Text style={styles.primaryText}>Take a photo</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={pickLibrary}><Ionicons name="images-outline" size={19} color={strictlyColors.text} /><Text style={styles.secondaryText}>Choose from library</Text></TouchableOpacity>
      <View style={styles.captureOptions}><TouchableOpacity style={styles.captureOption} onPress={() => navigation.getParent()?.navigate("FoodCapture", { mode: "barcode", returnTo: "BuildMeal" })}><Ionicons name="barcode-outline" size={21} color={strictlyColors.accentText} /><Text style={styles.captureOptionTitle}>Barcode</Text><Text style={styles.captureOptionText}>Find a packaged food</Text></TouchableOpacity><TouchableOpacity style={styles.captureOption} onPress={() => navigation.getParent()?.navigate("FoodCapture", { mode: "label", returnTo: "BuildMeal" })}><Ionicons name="document-text-outline" size={21} color={strictlyColors.accentText} /><Text style={styles.captureOptionTitle}>Nutrition label</Text><Text style={styles.captureOptionText}>Read printed macros</Text></TouchableOpacity></View>
      <View style={styles.truth}><Ionicons name="shield-checkmark-outline" size={19} color={strictlyColors.text} /><Text style={styles.truthText}><Text style={styles.truthStrong}>You stay in control.</Text> Photo values are estimates. You can change portions, remove mistakes, and add missing foods before anything is logged.</Text></View>
    </> : <>
      <Image source={{ uri: photoUri }} style={styles.photo} />
      {loading ? <View style={styles.loadingCard}><LoadingState title={analysis ? "Refining your meal" : "Reading your plate"} messages={["Finding visible foods", "Estimating portions", "Checking the nutrition estimate"]} /></View> : analysis ? <>
        <View style={styles.estimateHead}><View><Text style={styles.estimateLabel}>CAMERA ESTIMATE · {analysis.confidence}% CONFIDENCE · {analysis.imageCount || photoUris.length || 1} VIEW{(analysis.imageCount || photoUris.length) === 1 ? "" : "S"}</Text><Text style={styles.estimateName}>{analysis.mealName}</Text></View><Text style={styles.estimateCarbs}>~{Math.round(estimatedCarbs)}g<Text style={styles.estimateUnit}> carbs</Text></Text></View>
        <Text style={styles.range}>Plausible range: {Math.round(estimatedCarbRange[0])}–{Math.round(estimatedCarbRange[1])} g carbs. This range tightens as you confirm highlighted amounts.</Text>
        {analysis.captureIssues?.length ? <View style={styles.captureWarning}><Ionicons name="camera-outline" size={18} color={strictlyColors.clay} /><Text style={styles.warningText}>{analysis.captureIssues.join(" ")}</Text></View> : null}
        <View style={styles.items}>{items.map((item) => <View key={item.id} style={[styles.item, item.requiresQuantityConfirmation && styles.itemNeedsReview]}><View style={styles.itemCopy}><Text style={styles.itemName}>{item.food.name}</Text><Text style={styles.itemMeta}>{item.gramsRange ? `${Math.round(item.gramsRange[0])}–${Math.round(item.gramsRange[1])} g visual range` : item.food.servingLabel} · food {item.foodConfidence}% · portion {item.portionConfidence}%</Text><Text style={styles.sourceMeta}>{item.requiresQuantityConfirmation ? "OPTIONAL AMOUNT CHECK" : item.food.source === "ai_estimate" ? "AI NUTRITION FALLBACK" : `${item.food.source.toUpperCase()} NUTRITION MATCH · ${item.nutritionMatchConfidence}%`}</Text></View><TouchableOpacity style={[styles.gramsButton, item.requiresQuantityConfirmation && styles.gramsButtonReview]} onPress={() => setEditingId(item.id)}><Text style={styles.grams}>{item.requiresQuantityConfirmation ? "Adjust " : ""}{Math.round(item.grams)}g</Text><Ionicons name="create-outline" size={12} color={strictlyColors.textSoft} /></TouchableOpacity><TouchableOpacity onPress={() => setItems((current) => current.filter((row) => row.id !== item.id))}><Ionicons name="close-circle" size={21} color={strictlyColors.textSoft} /></TouchableOpacity></View>)}</View>
        <TouchableOpacity style={styles.editFoods} onPress={() => { setIngredients(items); navigation.getParent()?.navigate("BuildMeal", { suggestedName: analysis.mealName }); }}><Ionicons name="add-circle-outline" size={17} color={strictlyColors.text} /><Text style={styles.editFoodsText}>Add or replace a food</Text></TouchableOpacity>
        {nutritionWarnings.length ? <View style={styles.warning}><Ionicons name="alert-circle-outline" size={18} color={strictlyColors.clay} /><Text style={styles.warningText}>Strictly corrected an inconsistent calorie value from the matched nutrition record. Review the affected food before logging.</Text></View> : null}
        {analysis.needsUserInput && analysis.followUpQuestion ? <View style={styles.followup}><View style={styles.followupHead}><Ionicons name="help-circle-outline" size={19} color={strictlyColors.clay} /><View style={styles.followupCopy}><Text style={styles.followupLabel}>OPTIONAL ACCURACY CHECK</Text><Text style={styles.followupQuestion}>{analysis.followUpQuestion}</Text></View></View>{analysis.followUpOptions?.length ? <View style={styles.followupOptions}>{analysis.followUpOptions.map((option) => <TouchableOpacity key={option} onPress={() => setContext(option)} style={[styles.followupOption, context === option && styles.followupOptionActive]}><Text style={[styles.followupOptionText, context === option && styles.followupOptionTextActive]}>{option}</Text></TouchableOpacity>)}</View> : null}<TextInput value={context} onChangeText={setContext} placeholder="Or type a more exact answer" placeholderTextColor={strictlyColors.textSoft} style={styles.contextInput} /><TouchableOpacity disabled={!context.trim()} onPress={refine} style={[styles.refine, !context.trim() && styles.disabled]}><Text style={styles.refineText}>Update my estimate</Text></TouchableOpacity><TouchableOpacity onPress={acceptBestEstimate} style={styles.useEstimate}><Text style={styles.useEstimateText}>Use Strictly's best estimate</Text></TouchableOpacity><Text style={styles.refineNote}>Optional. Answering narrows the range; skipping keeps the wider visual estimate.</Text></View> : null}
        {clarificationAnswered && !analysis.needsUserInput ? <View style={styles.confidenceImproved}><Ionicons name="checkmark-circle" size={18} color={strictlyColors.lime} /><Text style={styles.confidenceImprovedText}>Estimate updated with your answer.</Text></View> : null}
        {bestEstimateAccepted ? <View style={styles.estimateAccepted}><Ionicons name="information-circle-outline" size={18} color={strictlyColors.text} /><Text style={styles.estimateAcceptedText}>Using the visual estimate. Its original confidence and plausible ranges are preserved.</Text></View> : null}
        <TouchableOpacity style={styles.primary} onPress={confirm}><Text style={styles.primaryText}>{itemsNeedingConfirmation.length ? "Continue with best estimate" : "Confirm foods and score"}</Text><Ionicons name="arrow-forward" size={18} color={strictlyColors.onLime} /></TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => { setPhotoUri(undefined); setPhotoUris([]); setPendingPhotoUris([]); setBase64Images([]); setAnalysis(undefined); setItems([]); }}><Text style={styles.secondaryText}>Retake photos</Text></TouchableOpacity>
        <Text style={styles.disclaimer}>{analysis.disclaimer} Digestion classes are practical meal-planning estimates, not direct measurements.</Text>
      </> : null}
      {editingId ? <ValueEditorSheet visible label={items.find((item) => item.id === editingId)?.food.name || "Food amount"} value={items.find((item) => item.id === editingId)?.grams || 100} presets={portionPresets(items.find((item) => item.id === editingId))} onClose={() => setEditingId(undefined)} onSave={saveEditedAmount} /> : null}
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
  angleCard: { flexDirection: "row", gap: 12, padding: 15, marginTop: 12, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream, borderWidth: 1, borderColor: strictlyColors.border },
  angleIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.lime },
  angleCopy: { flex: 1 },
  angleTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 13 },
  angleText: { marginTop: 4, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15 },
  textAction: { minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 4 },
  textActionLabel: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 11, fontWeight: "700" },
  primary: { minHeight: 54, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 14 },
  primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.onLime },
  secondary: { minHeight: 52, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 8 },
  secondaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text },
  captureOptions: { flexDirection: "row", gap: 8, marginTop: 9 },
  captureOption: { flex: 1, minHeight: 88, padding: 13, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  captureOptionTitle: { marginTop: 7, fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 12 },
  captureOptionText: { marginTop: 3, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9 },
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
  itemNeedsReview: { backgroundColor: strictlyColors.cream },
  itemCopy: { flex: 1 },
  itemName: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 13 },
  itemMeta: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, marginTop: 3 },
  sourceMeta: { fontFamily: strictlyType.mono, color: strictlyColors.muted, fontSize: 7, marginTop: 4, textTransform: "uppercase" },
  gramsButton: { minWidth: 64, height: 34, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted, paddingHorizontal: 8, borderRadius: 9 },
  gramsButtonReview: { minWidth: 92, backgroundColor: strictlyColors.lime },
  grams: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 },
  editFoods: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 8, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  editFoodsText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 11 },
  warning: { flexDirection: "row", gap: 9, padding: 13, marginTop: 9, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.dangerSurface },
  captureWarning: { flexDirection: "row", gap: 9, padding: 13, marginTop: 9, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.cream },
  warningText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 10, lineHeight: 15 },
  followup: { padding: 14, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large, marginTop: 12 },
  followupHead: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  followupCopy: { flex: 1 },
  followupLabel: { fontFamily: strictlyType.mono, color: strictlyColors.clay, fontSize: 8, letterSpacing: 0.9, marginBottom: 4 },
  followupQuestion: { fontFamily: strictlyType.sansMedium, color: strictlyColors.text, fontSize: 12, lineHeight: 18 },
  followupOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 11 },
  followupOption: { minHeight: 38, justifyContent: "center", paddingHorizontal: 12, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.borderStrong },
  followupOptionActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime },
  followupOptionText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.text, fontSize: 10, fontWeight: "700" },
  followupOptionTextActive: { color: strictlyColors.onLime },
  contextInput: { minHeight: 46, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.borderStrong, borderRadius: strictlyRadius.medium, paddingHorizontal: 12, marginTop: 9, fontFamily: strictlyType.sans, color: strictlyColors.text },
  refine: { alignItems: "center", padding: 12, backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.medium, marginTop: 8 },
  refineText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.white, fontSize: 12 },
  useEstimate: { alignItems: "center", padding: 11, marginTop: 6 },
  useEstimateText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 11 },
  refineNote: { marginTop: 7, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, textAlign: "center" },
  confidenceImproved: { flexDirection: "row", alignItems: "center", gap: 7, padding: 12, marginTop: 10, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  confidenceImprovedText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.text, fontSize: 10, fontWeight: "700" },
  estimateAccepted: { flexDirection: "row", alignItems: "center", gap: 7, padding: 12, marginTop: 10, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  estimateAcceptedText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15 },
  disabled: { opacity: 0.4 },
  disclaimer: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 11 },
});
