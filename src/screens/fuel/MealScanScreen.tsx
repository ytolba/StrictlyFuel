import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { analyzeMealPhoto } from "../../services/mealAnalysisService";
import { inferCarbSpeed } from "../../logic/nutritionEngine";
import { saveMeal } from "../../services/fuelService";
import type { FuelFood, MealIngredient } from "../../types/fuel";
import type { MealAnalysis } from "../../types/mealAnalysis";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

function detectedIngredients(analysis: MealAnalysis): MealIngredient[] {
  return analysis.items.map((item, index) => {
    const grams = Math.max(1, item.estimatedGrams || 100);
    const factor = 100 / grams;
    const base: FuelFood = {
      id: `ai-${item.id}-${index}`,
      name: item.name,
      aliases: [],
      emoji: "◉",
      category: item.carbs >= item.protein ? "grain" : "protein",
      carbSpeed: "medium",
      timing: "Estimated from meal photo",
      defaultGrams: grams,
      servingLabel: item.portionDescription,
      per100g: {
        calories: (item.calories || 0) * factor,
        carbs: (item.carbs || 0) * factor,
        protein: (item.protein || 0) * factor,
        fat: (item.fat || 0) * factor,
        fiber: (item.fiber || 0) * factor,
      },
      source: "ai_estimate",
    };
    base.carbSpeed = inferCarbSpeed(base);
    return { id: `detected-${item.id}-${index}`, food: base, grams, confidence: item.confidence, estimated: true };
  });
}

export default function MealScanScreen({ navigation }: any) {
  const { user } = useAuth();
  const { target, workout, setIngredients, buildMeal } = useFuel();
  const [photoUri, setPhotoUri] = useState<string>();
  const [base64, setBase64] = useState("");
  const [analysis, setAnalysis] = useState<MealAnalysis>();
  const [items, setItems] = useState<MealIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");

  const estimatedCarbs = useMemo(() => items.reduce((sum, item) => sum + item.food.per100g.carbs * item.grams / 100, 0), [items]);

  const pick = async (source: "camera" | "library") => {
    if (!target) return Alert.alert("Set your workout first", "Strictly scores a meal against a specific workout and timing window.", [{ text: "Go to Home", onPress: () => navigation.navigate("Home") }]);
    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", `Allow ${source === "camera" ? "camera" : "photo library"} access to scan a meal.`);
    const result = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
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
    } catch (error: any) {
      setPhotoUri(undefined);
      Alert.alert("Could not read this meal", error?.message || "Try again in brighter light with the full plate visible.");
    } finally { setLoading(false); }
  };

  const refine = async () => {
    if (!base64 || !context.trim()) return;
    setLoading(true);
    try {
      const next = await analyzeMealPhoto(base64, `User confirmed: ${context.trim()}`);
      setAnalysis(next);
      setItems(detectedIngredients(next));
    } catch (error: any) { Alert.alert("Could not refine this estimate", error?.message || "Try again."); }
    finally { setLoading(false); }
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
      <View style={styles.hero}><View style={styles.cameraCircle}><Ionicons name="camera-outline" size={31} color={strictlyColors.ink} /></View><Text style={styles.heroTitle}>Show us your plate</Text><Text style={styles.heroText}>Include the full meal from a slight angle. A known plate size or visible package improves the estimate.</Text></View>
      <TouchableOpacity style={styles.primary} onPress={() => pick("camera")}><Ionicons name="camera" size={19} color={strictlyColors.ink} /><Text style={styles.primaryText}>Take a photo</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => pick("library")}><Ionicons name="images-outline" size={19} color={strictlyColors.ink} /><Text style={styles.secondaryText}>Choose from library</Text></TouchableOpacity>
      <View style={styles.truth}><Ionicons name="shield-checkmark-outline" size={19} color={strictlyColors.ink} /><Text style={styles.truthText}><Text style={styles.truthStrong}>You stay in control.</Text> Photo values are estimates. You can change portions, remove mistakes, and add missing foods before anything is logged.</Text></View>
    </> : <>
      <Image source={{ uri: photoUri }} style={styles.photo} />
      {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={strictlyColors.ink} /><Text style={styles.loadingTitle}>Reading your plate</Text><Text style={styles.loadingText}>Estimating visible foods and portions.</Text></View> : analysis ? <>
        <View style={styles.estimateHead}><View><Text style={styles.estimateLabel}>CAMERA ESTIMATE · {analysis.confidence}% CONFIDENCE</Text><Text style={styles.estimateName}>{analysis.mealName}</Text></View><Text style={styles.estimateCarbs}>~{Math.round(estimatedCarbs)}g<Text style={styles.estimateUnit}> carbs</Text></Text></View>
        <Text style={styles.range}>Likely range: {Math.round(analysis.ranges.carbs[0])}–{Math.round(analysis.ranges.carbs[1])} g carbs. Correct the foods below before scoring.</Text>
        <View style={styles.items}>{items.map((item) => <View key={item.id} style={styles.item}><View style={styles.itemCopy}><Text style={styles.itemName}>{item.food.name}</Text><Text style={styles.itemMeta}>{item.food.servingLabel} · {item.confidence}% confidence</Text></View><TextInput value={String(Math.round(item.grams))} onChangeText={(value) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, grams: Math.max(1, Number(value) || 1) } : row))} keyboardType="number-pad" style={styles.grams} /><Text style={styles.g}>g</Text><TouchableOpacity onPress={() => setItems((current) => current.filter((row) => row.id !== item.id))}><Ionicons name="close-circle" size={21} color={strictlyColors.textSoft} /></TouchableOpacity></View>)}</View>
        {analysis.followUpQuestion ? <View style={styles.followup}><Text style={styles.followupQuestion}>{analysis.followUpQuestion}</Text><TextInput value={context} onChangeText={setContext} placeholder="Add portion or preparation details" placeholderTextColor={strictlyColors.textSoft} style={styles.contextInput} /><TouchableOpacity disabled={!context.trim()} onPress={refine} style={[styles.refine, !context.trim() && styles.disabled]}><Text style={styles.refineText}>Refine estimate</Text></TouchableOpacity></View> : null}
        <TouchableOpacity style={styles.primary} onPress={confirm}><Text style={styles.primaryText}>Confirm foods and score</Text><Ionicons name="arrow-forward" size={18} color={strictlyColors.ink} /></TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => { setPhotoUri(undefined); setAnalysis(undefined); setItems([]); }}><Text style={styles.secondaryText}>Retake photo</Text></TouchableOpacity>
        <Text style={styles.disclaimer}>{analysis.disclaimer} Digestion classes are practical meal-planning estimates, not direct measurements.</Text>
      </> : null}
    </>}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 34, paddingHorizontal: 15, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large },
  cameraCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 25, color: strictlyColors.ink, marginTop: 18 },
  heroText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7, maxWidth: 300 },
  primary: { minHeight: 54, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 14 },
  primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink },
  secondary: { minHeight: 52, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 8 },
  secondaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink },
  truth: { flexDirection: "row", gap: 10, padding: 14, marginTop: 18 },
  truthText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17 },
  truthStrong: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink },
  photo: { width: "100%", height: 260, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surfaceMuted },
  loading: { alignItems: "center", paddingVertical: 38 },
  loadingTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 20, marginTop: 14 },
  loadingText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, marginTop: 4 },
  estimateHead: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-end", marginTop: 18 },
  estimateLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 0.8 },
  estimateName: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 21, marginTop: 6, maxWidth: 210 },
  estimateCarbs: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 25 },
  estimateUnit: { fontFamily: strictlyType.sans, fontWeight: "400", color: strictlyColors.textSoft, fontSize: 9 },
  range: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 9 },
  items: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, overflow: "hidden", marginTop: 14 },
  item: { flexDirection: "row", alignItems: "center", gap: 7, padding: 13, borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  itemCopy: { flex: 1 },
  itemName: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 13 },
  itemMeta: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, marginTop: 3 },
  grams: { width: 43, textAlign: "right", fontFamily: strictlyType.sansMedium, color: strictlyColors.ink, fontSize: 13, backgroundColor: strictlyColors.surfaceMuted, paddingVertical: 7, paddingHorizontal: 5, borderRadius: 7 },
  g: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8 },
  followup: { padding: 14, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large, marginTop: 12 },
  followupQuestion: { fontFamily: strictlyType.sansMedium, color: strictlyColors.ink, fontSize: 12, lineHeight: 18 },
  contextInput: { minHeight: 46, backgroundColor: strictlyColors.white, borderRadius: strictlyRadius.medium, paddingHorizontal: 12, marginTop: 9, fontFamily: strictlyType.sans, color: strictlyColors.ink },
  refine: { alignItems: "center", padding: 12, backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.medium, marginTop: 8 },
  refineText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.white, fontSize: 12 },
  disabled: { opacity: 0.4 },
  disclaimer: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 11 },
});
