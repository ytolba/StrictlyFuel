import React, { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { ValueEditorSheet } from "../../components/fuel/ValueEditorSheet";
import { lookupFoodBarcode } from "../../services/foodCatalogService";
import { analyzeFoodLabel, saveFoodLabel } from "../../services/foodCaptureService";
import { isAiLimitError } from "../../services/functionErrors";
import { useFuel } from "../../contexts/FuelContext";
import type { FoodLabelAnalysis } from "../../types/foodCapture";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type Mode = "choose" | "barcode" | "label";

type NumericField = "servingGrams" | "caloriesPerServing" | "carbsPerServing" | "proteinPerServing" | "fatPerServing" | "fiberPerServing" | "sugarPerServing" | "sodiumMgPerServing";
const numericFields: { key: NumericField; label: string; unit: string }[] = [
  { key: "servingGrams", label: "Serving weight", unit: "g" }, { key: "caloriesPerServing", label: "Calories", unit: "kcal" },
  { key: "carbsPerServing", label: "Carbohydrates", unit: "g" }, { key: "proteinPerServing", label: "Protein", unit: "g" },
  { key: "fatPerServing", label: "Fat", unit: "g" }, { key: "fiberPerServing", label: "Fiber", unit: "g" },
  { key: "sugarPerServing", label: "Sugar", unit: "g" }, { key: "sodiumMgPerServing", label: "Sodium", unit: "mg" },
];

export default function FoodCaptureScreen({ navigation }: any) {
  const { addIngredient } = useFuel();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>("choose");
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [photoUri, setPhotoUri] = useState<string>();
  const [label, setLabel] = useState<FoodLabelAnalysis>();
  const [numericKey, setNumericKey] = useState<NumericField>();

  const addAndReturn = (food: any) => {
    addIngredient({ food, grams: food.defaultGrams });
    navigation.goBack();
  };

  const findBarcode = async (value: string) => {
    const barcode = value.replace(/\D/g, "");
    if (barcode.length < 8 || loading) return;
    setScanned(true); setLoading(true); setNotFound(false);
    try {
      const food = await lookupFoodBarcode(barcode);
      if (food) addAndReturn(food);
      else setNotFound(true);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  };

  const captureLabel = async () => {
    const access = await ImagePicker.requestCameraPermissionsAsync();
    if (!access.granted) return Alert.alert("Camera permission needed", "Allow camera access to read a package label.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
    setPhotoUri(result.assets[0].uri); setLoading(true); setLabel(undefined);
    try {
      const prepared = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1800 } }], { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!prepared.base64) throw new Error("The label photo could not be prepared.");
      setLabel(await analyzeFoodLabel(prepared.base64));
    } catch (error) {
      if (isAiLimitError(error)) {
        Alert.alert("Weekly scans used up", error.message, [
          { text: "Not now", style: "cancel" },
          { text: "See Pro", onPress: () => navigation.getParent()?.navigate("Paywall") },
        ]);
      } else {
        Alert.alert("Could not read this label", error instanceof Error ? error.message : "Try again in brighter light.");
      }
    }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!label?.productName.trim() || label.servingGrams <= 0) return Alert.alert("Check the label", "Add a product name and serving weight first.");
    setLoading(true);
    try { addAndReturn(await saveFoodLabel(label)); }
    catch (error) { Alert.alert("Could not save this product", error instanceof Error ? error.message : "Try again."); }
    finally { setLoading(false); }
  };

  const title = mode === "barcode" ? "Scan barcode" : mode === "label" ? "Add from label" : "Add a packaged food";
  return <ScreenShell title={title} eyebrow="FOOD CAPTURE" back onBack={() => mode === "choose" ? navigation.goBack() : setMode("choose")}>
    {mode === "choose" ? <>
      <Text style={styles.intro}>Use the fastest source available. You’ll always review the food before it enters your meal.</Text>
      <TouchableOpacity style={styles.choice} onPress={() => setMode("barcode")}><View style={styles.choiceIcon}><Ionicons name="barcode-outline" size={27} color={strictlyColors.onLime} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Scan a barcode</Text><Text style={styles.choiceText}>Find the exact packaged product and its listed macros.</Text></View><Ionicons name="chevron-forward" size={19} color={strictlyColors.text} /></TouchableOpacity>
      <TouchableOpacity style={styles.choice} onPress={() => setMode("label")}><View style={styles.choiceIcon}><Ionicons name="document-text-outline" size={27} color={strictlyColors.onLime} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Photograph the label</Text><Text style={styles.choiceText}>If it isn’t found, read the nutrition panel and ingredients, correct it, then contribute it.</Text></View><Ionicons name="chevron-forward" size={19} color={strictlyColors.text} /></TouchableOpacity>
    </> : null}

    {mode === "barcode" ? <>
      {!permission?.granted ? <TouchableOpacity style={styles.primary} onPress={requestPermission}><Text style={styles.primaryText}>Allow camera access</Text></TouchableOpacity> :
        <View style={styles.cameraWrap}><CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }} onBarcodeScanned={scanned ? undefined : (event: BarcodeScanningResult) => findBarcode(event.data)} /><View pointerEvents="none" style={styles.scanFrame} /><Text style={styles.cameraHint}>Center the barcode inside the frame</Text></View>}
      {loading ? <View style={styles.loadingCard}><LoadingState title="Looking up this product" messages={["Checking Strictly’s catalog", "Searching trusted product data", "Matching the exact barcode"]} /></View> : null}
      {notFound ? <View style={styles.notFound}><Text style={styles.notFoundTitle}>We don’t have this one yet</Text><Text style={styles.notFoundText}>Photograph its nutrition and ingredient label to add it for yourself and help the catalog grow.</Text><TouchableOpacity style={styles.primary} onPress={() => setMode("label")}><Text style={styles.primaryText}>Scan the package label</Text></TouchableOpacity><TouchableOpacity onPress={() => { setScanned(false); setNotFound(false); }} style={styles.tryAgain}><Text style={styles.tryAgainText}>Try barcode again</Text></TouchableOpacity></View> : null}
      <View style={styles.manual}><Text style={styles.fieldLabel}>ENTER BARCODE</Text><View style={styles.manualRow}><TextInput value={manualBarcode} onChangeText={setManualBarcode} keyboardType="number-pad" placeholder="012345678901" placeholderTextColor={strictlyColors.textSoft} style={styles.manualInput} /><TouchableOpacity onPress={() => findBarcode(manualBarcode)} style={styles.go}><Ionicons name="arrow-forward" size={19} color={strictlyColors.onLime} /></TouchableOpacity></View></View>
    </> : null}

    {mode === "label" ? <>
      {!photoUri ? <View style={styles.labelHero}><Ionicons name="document-text-outline" size={42} color={strictlyColors.text} /><Text style={styles.labelTitle}>Capture the useful side</Text><Text style={styles.labelText}>Keep the nutrition facts, serving size, ingredients, product name, and barcode as flat and readable as possible.</Text><TouchableOpacity style={styles.primary} onPress={captureLabel}><Ionicons name="camera" size={19} color={strictlyColors.onLime} /><Text style={styles.primaryText}>Take label photo</Text></TouchableOpacity></View> : <Image source={{ uri: photoUri }} style={styles.photo} />}
      {loading ? <View style={styles.loadingCard}><LoadingState title={label ? "Saving this food" : "Reading the package"} messages={["Finding serving size", "Reading macros", "Checking ingredients and carb speed"]} /></View> : null}
      {label && !loading ? <View style={styles.form}>
        <View style={styles.review}><Ionicons name={label.needsCorrection ? "alert-circle-outline" : "checkmark-circle-outline"} size={20} color={strictlyColors.text} /><Text style={styles.reviewText}>{label.needsCorrection ? "Review highlighted values before saving." : `${label.confidence}% read confidence. Confirm everything below.`}</Text></View>
        <Text style={styles.fieldLabel}>PRODUCT</Text><TextInput value={label.productName} onChangeText={(productName) => setLabel({ ...label, productName })} style={styles.textField} placeholder="Product name" />
        <TextInput value={label.brand} onChangeText={(brand) => setLabel({ ...label, brand })} style={styles.textField} placeholder="Brand (optional)" />
        <TextInput value={label.servingLabel} onChangeText={(servingLabel) => setLabel({ ...label, servingLabel })} style={styles.textField} placeholder="Serving, e.g. 1 bar" />
        <View style={styles.numericGrid}>{numericFields.map((field) => <View key={field.key} style={styles.numericField}><Text style={styles.numberLabel}>{field.label}</Text><TouchableOpacity onPress={() => setNumericKey(field.key)} style={styles.numberInputWrap}><Text style={styles.numberInput}>{Math.round(Number(label[field.key]) * 10) / 10}</Text><Text style={styles.unit}>{field.unit}</Text><Ionicons name="create-outline" size={13} color={strictlyColors.textSoft} /></TouchableOpacity></View>)}</View>
        <Text style={styles.fieldLabel}>INGREDIENTS</Text><TextInput value={label.ingredientsText} onChangeText={(ingredientsText) => setLabel({ ...label, ingredientsText })} multiline style={[styles.textField, styles.ingredients]} placeholder="Ingredients from package" />
        <Text style={styles.fieldLabel}>CARB SPEED</Text><View style={styles.speedRow}>{(["fast", "medium", "slow"] as const).map((speed) => <TouchableOpacity key={speed} onPress={() => setLabel({ ...label, carbSpeed: speed })} style={[styles.speed, label.carbSpeed === speed && styles.speedActive]}><Text style={[styles.speedText, label.carbSpeed === speed && styles.speedTextActive]}>{speed}</Text></TouchableOpacity>)}</View>
        <Text style={styles.reason}>{label.carbSpeedReason}</Text>
        <TouchableOpacity style={styles.primary} onPress={save}><Text style={styles.primaryText}>Save and add to meal</Text><Ionicons name="arrow-forward" size={18} color={strictlyColors.onLime} /></TouchableOpacity>
        <TouchableOpacity style={styles.retake} onPress={() => { setPhotoUri(undefined); setLabel(undefined); }}><Text style={styles.tryAgainText}>Retake photo</Text></TouchableOpacity>
      </View> : null}
    </> : null}
    {label && numericKey ? <ValueEditorSheet visible label={numericFields.find((field) => field.key === numericKey)?.label || "Nutrition value"} value={Number(label[numericKey]) || 1} unit={numericFields.find((field) => field.key === numericKey)?.unit || "g"} presets={numericKey === "servingGrams" ? [30, 50, 100, 150] : numericKey === "caloriesPerServing" ? [100, 200, 300, 400] : [5, 15, 30, 60]} onClose={() => setNumericKey(undefined)} onSave={(value) => setLabel({ ...label, [numericKey]: value })} /> : null}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  intro: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  choice: { minHeight: 112, flexDirection: "row", alignItems: "center", gap: 13, padding: 16, marginBottom: 10, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 1, borderColor: strictlyColors.border },
  choiceIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" }, choiceCopy: { flex: 1 },
  choiceTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 16 }, choiceText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 4 },
  cameraWrap: { height: 390, overflow: "hidden", borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.ink }, camera: { flex: 1 },
  scanFrame: { position: "absolute", left: 34, right: 34, top: 112, height: 128, borderRadius: 18, borderWidth: 3, borderColor: strictlyColors.lime }, cameraHint: { position: "absolute", bottom: 22, alignSelf: "center", color: strictlyColors.white, fontFamily: strictlyType.sansMedium, fontSize: 12 },
  loadingCard: { marginTop: 12, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large }, notFound: { padding: 18, marginTop: 12, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 1, borderColor: strictlyColors.border },
  notFoundTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 18 }, notFoundText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 6 },
  primary: { minHeight: 54, paddingHorizontal: 18, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 15 }, primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.onLime, fontSize: 13 },
  tryAgain: { alignItems: "center", padding: 13 }, tryAgainText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 },
  manual: { marginTop: 18 }, fieldLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.2, marginTop: 16, marginBottom: 7 }, manualRow: { flexDirection: "row", gap: 8 },
  manualInput: { flex: 1, height: 52, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, paddingHorizontal: 14, fontFamily: strictlyType.sansMedium, color: strictlyColors.text }, go: { width: 52, height: 52, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  labelHero: { padding: 26, alignItems: "center", backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 1, borderColor: strictlyColors.border }, labelTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 22, marginTop: 13 }, labelText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 7 },
  photo: { width: "100%", height: 230, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surfaceMuted }, form: { marginTop: 12 }, review: { flexDirection: "row", gap: 9, padding: 13, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium }, reviewText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 11, lineHeight: 16 },
  textField: { minHeight: 50, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.medium, borderWidth: 1, borderColor: strictlyColors.border, paddingHorizontal: 13, marginBottom: 8, color: strictlyColors.text, fontFamily: strictlyType.sans }, ingredients: { minHeight: 110, paddingTop: 13, textAlignVertical: "top" },
  numericGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, numericField: { width: "48%" }, numberLabel: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, marginBottom: 5 }, numberInputWrap: { height: 48, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.medium, borderWidth: 1, borderColor: strictlyColors.border, paddingHorizontal: 11 }, numberInput: { flex: 1, color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 15 }, unit: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8 },
  speedRow: { flexDirection: "row", gap: 7 }, speed: { flex: 1, height: 43, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, speedActive: { backgroundColor: strictlyColors.ink, borderColor: strictlyColors.ink }, speedText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, textTransform: "capitalize", fontSize: 12 }, speedTextActive: { color: strictlyColors.lime, fontWeight: "800" }, reason: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 8 }, retake: { alignItems: "center", padding: 15 },
});
