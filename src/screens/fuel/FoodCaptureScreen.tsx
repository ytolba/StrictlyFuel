import React, { useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { ValueEditorSheet } from "../../components/fuel/ValueEditorSheet";
import { PhotoCamera } from "../../components/fuel/PhotoCamera";
import { lookupFoodBarcode } from "../../services/foodCatalogService";
import { saveFoodLabel } from "../../services/foodCaptureService";
import { extractTextFromImage } from "../../utils/AppleVisionOCR";
import { parseNutritionLabelText } from "../../services/nutritionLabelParser";
import { useFuel } from "../../contexts/FuelContext";
import type { FoodLabelAnalysis } from "../../types/foodCapture";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type Mode = "choose" | "barcode" | "label";

type NumericField = "servingGrams" | "caloriesPerServing" | "carbsPerServing" | "proteinPerServing" | "fatPerServing" | "fiberPerServing" | "sugarPerServing" | "sugarAlcoholsPerServing" | "allulosePerServing" | "sodiumMgPerServing";
const numericFields: { key: NumericField; label: string; unit: string }[] = [
  { key: "servingGrams", label: "Serving weight", unit: "g" }, { key: "caloriesPerServing", label: "Calories", unit: "kcal" },
  { key: "carbsPerServing", label: "Carbohydrates", unit: "g" }, { key: "proteinPerServing", label: "Protein", unit: "g" },
  { key: "fatPerServing", label: "Fat", unit: "g" }, { key: "fiberPerServing", label: "Fiber", unit: "g" },
  { key: "sugarPerServing", label: "Sugar", unit: "g" }, { key: "sodiumMgPerServing", label: "Sodium", unit: "mg" },
  { key: "sugarAlcoholsPerServing", label: "Sugar alcohols", unit: "g" }, { key: "allulosePerServing", label: "Allulose", unit: "g" },
];

export default function FoodCaptureScreen({ navigation, route }: any) {
  const { addIngredient } = useFuel();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>(route.params?.mode || "choose");
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [photoUri, setPhotoUri] = useState<string>();
  const [label, setLabel] = useState<FoodLabelAnalysis>();
  const [numericKey, setNumericKey] = useState<NumericField>();
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [torch, setTorch] = useState(false);
  const [labelCameraOpen, setLabelCameraOpen] = useState(false);
  const scanLock = useRef(false);

  const closeCapture = () => {
    if (route.params?.returnTo === "BuildMeal") return navigation.replace("BuildMeal");
    if (navigation.canGoBack?.()) return navigation.goBack();
    const parent = navigation.getParent?.();
    if (parent?.canGoBack?.()) return parent.goBack();
    navigation.navigate("BuildMeal");
  };

  const addAndReturn = (food: any) => {
    addIngredient({ food, grams: food.defaultGrams });
    closeCapture();
  };

  const findBarcode = async (value: string) => {
    const barcode = value.replace(/\D/g, "");
    if (barcode.length < 8 || loading || scanLock.current) return;
    scanLock.current = true;
    setScannedBarcode(barcode);
    setScanned(true); setLoading(true); setNotFound(false);
    try {
      const food = await lookupFoodBarcode(barcode);
      if (food) addAndReturn(food);
      else setNotFound(true);
    } catch { setNotFound(true); }
    finally { setLoading(false); scanLock.current = false; }
  };

  const captureLabel = async (uri: string) => {
    setLabelCameraOpen(false);
    setPhotoUri(uri); setLoading(true); setLabel(undefined);
    try {
      const prepared = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1800 } }], { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!prepared.base64) throw new Error("The label photo could not be prepared.");
      // Nutrition facts are printed data, so keep this path private, fast and
      // deterministic: Apple's on-device Vision OCR reads the text and the
      // parser maps only numbers that are actually visible on the label.
      const text = await extractTextFromImage(uri);
      setLabel(parseNutritionLabelText(text));
    } catch (error) {
      Alert.alert("Could not read this label", error instanceof Error ? error.message : "Try again in brighter light with the nutrition panel flat and close to the camera.");
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
  return <ScreenShell title={title} eyebrow="FOOD CAPTURE" back onBack={() => labelCameraOpen ? setLabelCameraOpen(false) : mode === "choose" ? closeCapture() : setMode("choose")}>
    {mode === "choose" ? <>
      <Text style={styles.intro}>Use the fastest source available. You’ll always review the food before it enters your meal.</Text>
      <TouchableOpacity style={styles.choice} onPress={() => setMode("barcode")}><View style={styles.choiceIcon}><Ionicons name="barcode-outline" size={27} color={strictlyColors.onLime} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Scan a barcode</Text><Text style={styles.choiceText}>Find the exact packaged product and its listed macros.</Text></View><Ionicons name="chevron-forward" size={19} color={strictlyColors.text} /></TouchableOpacity>
      <TouchableOpacity style={styles.choice} onPress={() => setMode("label")}><View style={styles.choiceIcon}><Ionicons name="document-text-outline" size={27} color={strictlyColors.onLime} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Photograph the label</Text><Text style={styles.choiceText}>If it isn’t found, read the nutrition panel and ingredients, correct it, then contribute it.</Text></View><Ionicons name="chevron-forward" size={19} color={strictlyColors.text} /></TouchableOpacity>
    </> : null}

    {mode === "barcode" ? <>
      {loading ? <View style={styles.barcodeLoading}><View style={styles.barcodePill}><Ionicons name="barcode-outline" size={18} color={strictlyColors.text} /><Text style={styles.barcodeValue}>{scannedBarcode}</Text></View><LoadingState title="Finding your product" messages={["Checking the exact barcode", "Loading its package serving", "Adding one serving to your meal"]} /><Text style={styles.loadingNote}>Keep this screen open for a moment. Strictly will return you to your meal when the match is ready.</Text></View> : !permission?.granted ? <TouchableOpacity style={styles.primary} onPress={requestPermission}><Text style={styles.primaryText}>Allow camera access</Text></TouchableOpacity> :
        <View style={styles.cameraWrap}><CameraView style={styles.camera} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "itf14", "code128"] }} onBarcodeScanned={scanned ? undefined : (event: BarcodeScanningResult) => findBarcode(event.data)} /><TouchableOpacity style={[styles.flashButton, torch && styles.flashButtonActive]} onPress={() => setTorch((value) => !value)}><Ionicons name={torch ? "flash" : "flash-outline"} size={20} color={torch ? strictlyColors.onLime : strictlyColors.white} /></TouchableOpacity><View pointerEvents="none" style={styles.scanFrame} /><Text style={styles.cameraHint}>Center the barcode inside the frame</Text></View>}
      {notFound ? <View style={styles.notFound}><Text style={styles.notFoundTitle}>We don’t have this one yet</Text><Text style={styles.notFoundText}>Photograph its nutrition and ingredient label to add it for yourself and help the catalog grow.</Text><TouchableOpacity style={styles.primary} onPress={() => setMode("label")}><Text style={styles.primaryText}>Scan the package label</Text></TouchableOpacity><TouchableOpacity onPress={() => { setScanned(false); setNotFound(false); }} style={styles.tryAgain}><Text style={styles.tryAgainText}>Try barcode again</Text></TouchableOpacity></View> : null}
      {!loading ? <View style={styles.manual}><Text style={styles.fieldLabel}>ENTER BARCODE</Text><View style={styles.manualRow}><TextInput value={manualBarcode} onChangeText={setManualBarcode} keyboardType="number-pad" placeholder="012345678901" placeholderTextColor={strictlyColors.textSoft} style={styles.manualInput} /><TouchableOpacity onPress={() => findBarcode(manualBarcode)} style={styles.go}><Ionicons name="arrow-forward" size={19} color={strictlyColors.onLime} /></TouchableOpacity></View></View> : null}
    </> : null}

    {mode === "label" ? <>
      {labelCameraOpen ? <PhotoCamera hint="Keep the full label flat and readable" onCapture={captureLabel} onCancel={() => setLabelCameraOpen(false)} /> : !photoUri ? <View style={styles.labelHero}><Ionicons name="document-text-outline" size={42} color={strictlyColors.text} /><Text style={styles.labelTitle}>Capture the useful side</Text><Text style={styles.labelText}>Keep the nutrition facts, serving size, ingredients, product name, and barcode as flat and readable as possible.</Text><TouchableOpacity style={styles.primary} onPress={() => setLabelCameraOpen(true)}><Ionicons name="camera" size={19} color={strictlyColors.onLime} /><Text style={styles.primaryText}>Take label photo</Text></TouchableOpacity></View> : <Image source={{ uri: photoUri }} style={styles.photo} />}
      {loading ? <View style={styles.loadingCard}><LoadingState title={label ? "Saving this food" : "Reading on device"} messages={["Finding serving size", "Reading printed macros", "Preparing an editable label"]} /></View> : null}
      {label && !loading ? <View style={styles.form}>
        <View style={styles.review}><Ionicons name={label.needsCorrection ? "alert-circle-outline" : "checkmark-circle-outline"} size={20} color={strictlyColors.text} /><Text style={styles.reviewText}>{label.needsCorrection ? "Review highlighted values before saving." : `${label.confidence}% read confidence. Confirm everything below.`}</Text></View>
        <Text style={styles.fieldLabel}>PRODUCT</Text><TextInput value={label.productName} onChangeText={(productName) => setLabel({ ...label, productName })} style={styles.textField} placeholder="Product name" placeholderTextColor={strictlyColors.textSoft} />
        <TextInput value={label.brand} onChangeText={(brand) => setLabel({ ...label, brand })} style={styles.textField} placeholder="Brand (optional)" placeholderTextColor={strictlyColors.textSoft} />
        <TextInput value={label.servingLabel} onChangeText={(servingLabel) => setLabel({ ...label, servingLabel })} style={styles.textField} placeholder="Serving, e.g. 1 bar" placeholderTextColor={strictlyColors.textSoft} />
        <View style={styles.numericGrid}>{numericFields.map((field) => <View key={field.key} style={styles.numericField}><Text style={styles.numberLabel}>{field.label}</Text><TouchableOpacity onPress={() => setNumericKey(field.key)} style={styles.numberInputWrap}><Text style={styles.numberInput}>{Math.round(Number(label[field.key]) * 10) / 10}</Text><Text style={styles.unit}>{field.unit}</Text><Ionicons name="create-outline" size={13} color={strictlyColors.textSoft} /></TouchableOpacity></View>)}</View>
        {label.sugarAlcoholsPerServing > 0 ? <Text style={styles.reason}>Sugar alcohol: {label.sugarAlcoholType === "unknown" ? "type not specified on the label" : label.sugarAlcoholType}</Text> : null}
        <Text style={styles.fieldLabel}>INGREDIENTS</Text><TextInput value={label.ingredientsText} onChangeText={(ingredientsText) => setLabel({ ...label, ingredientsText })} multiline style={[styles.textField, styles.ingredients]} placeholder="Ingredients from package" placeholderTextColor={strictlyColors.textSoft} />
        <Text style={styles.fieldLabel}>CARB SPEED</Text><View style={styles.speedRow}>{(["fast", "medium", "slow", "unknown"] as const).map((speed) => <TouchableOpacity key={speed} onPress={() => setLabel({ ...label, carbSpeed: speed })} style={[styles.speed, label.carbSpeed === speed && styles.speedActive]}><Text style={[styles.speedText, label.carbSpeed === speed && styles.speedTextActive]}>{speed === "unknown" ? "not sure" : speed}</Text></TouchableOpacity>)}</View>
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
  choiceTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 16 }, choiceText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 4 },
  cameraWrap: { height: 390, overflow: "hidden", borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.ink }, camera: { flex: 1 },
  scanFrame: { position: "absolute", left: 34, right: 34, top: 112, height: 128, borderRadius: 18, borderWidth: 3, borderColor: strictlyColors.lime }, cameraHint: { position: "absolute", bottom: 22, alignSelf: "center", color: strictlyColors.white, fontFamily: strictlyType.sansMedium, fontSize: 12 },
  flashButton: { position: "absolute", top: 14, right: 14, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.glass }, flashButtonActive: { backgroundColor: strictlyColors.lime },
  loadingCard: { marginTop: 12, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large }, notFound: { padding: 18, marginTop: 12, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 1, borderColor: strictlyColors.border },
  barcodeLoading: { minHeight: 420, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 1, borderColor: strictlyColors.border },
  barcodePill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, height: 38, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.cream },
  barcodeValue: { fontFamily: strictlyType.mono, color: strictlyColors.text, fontSize: 11, letterSpacing: 0.3 },
  loadingNote: { maxWidth: 270, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, textAlign: "center" },
  notFoundTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 18 }, notFoundText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 6 },
  primary: { minHeight: 54, paddingHorizontal: 18, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 15 }, primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.onLime, fontSize: 13 },
  tryAgain: { alignItems: "center", padding: 13 }, tryAgainText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 },
  manual: { marginTop: 18 }, fieldLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 0.3, marginTop: 16, marginBottom: 7 }, manualRow: { flexDirection: "row", gap: 8 },
  manualInput: { flex: 1, height: 52, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, paddingHorizontal: 14, fontFamily: strictlyType.sansMedium, color: strictlyColors.text }, go: { width: 52, height: 52, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  labelHero: { padding: 26, alignItems: "center", backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 1, borderColor: strictlyColors.border }, labelTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 22, marginTop: 13 }, labelText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 7 },
  photo: { width: "100%", height: 230, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surfaceMuted }, form: { marginTop: 12 }, review: { flexDirection: "row", gap: 9, padding: 13, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium }, reviewText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 11, lineHeight: 16 },
  textField: { minHeight: 50, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.medium, borderWidth: 1, borderColor: strictlyColors.border, paddingHorizontal: 13, marginBottom: 8, color: strictlyColors.text, fontFamily: strictlyType.sans }, ingredients: { minHeight: 110, paddingTop: 13, textAlignVertical: "top" },
  numericGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, numericField: { width: "48%" }, numberLabel: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginBottom: 5 }, numberInputWrap: { height: 48, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.medium, borderWidth: 1, borderColor: strictlyColors.border, paddingHorizontal: 11 }, numberInput: { flex: 1, color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "700", fontSize: 15 }, unit: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 11 },
  speedRow: { flexDirection: "row", gap: 7 }, speed: { flex: 1, height: 43, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, speedActive: { backgroundColor: strictlyColors.ink, borderColor: strictlyColors.ink }, speedText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, textTransform: "capitalize", fontSize: 12 }, speedTextActive: { color: strictlyColors.lime, fontWeight: "700" }, reason: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 15, marginTop: 8 }, retake: { alignItems: "center", padding: 15 },
});
