import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { analyzeMealPhoto } from "../services/mealAnalysisService";
import type { MealAnalysis } from "../types/mealAnalysis";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type Food = { id: string; name: string; serving: string; calories: number; carbs: number; protein: number; fat: number };
const starterFoods: Food[] = [
  { id: "oats", name: "Rolled oats", serving: "1 cup cooked", calories: 158, carbs: 27, protein: 6, fat: 3 },
  { id: "banana", name: "Banana", serving: "1 medium", calories: 105, carbs: 27, protein: 1, fat: 0 },
  { id: "chicken", name: "Chicken breast", serving: "4 oz", calories: 187, carbs: 0, protein: 35, fat: 4 },
];

export default function FuelDashboardScreen({ navigation }: any) {
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState<Food[]>(starterFoods.slice(0, 2));
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState("");
  const [portionContext, setPortionContext] = useState("");
  const totals = useMemo(() => meal.reduce((t, f) => ({ calories: t.calories + f.calories, carbs: t.carbs + f.carbs, protein: t.protein + f.protein, fat: t.fat + f.fat }), { calories: 0, carbs: 0, protein: 0, fat: 0 }), [meal]);
  const results = starterFoods.filter((food) => food.name.toLowerCase().includes(query.toLowerCase()));

  const scanMeal = async (source: "camera" | "library") => {
    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", `Allow ${source === "camera" ? "camera" : "photo library"} access to analyze a meal.`);
    const picked = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (picked.canceled) return;
    setPhotoUri(picked.assets[0].uri); setAnalyzing(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: 1600 } }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!compressed.base64) throw new Error("Could not prepare the photo");
      setPendingBase64(compressed.base64);
      setAnalysis(await analyzeMealPhoto(compressed.base64));
    } catch (error: any) {
      setPhotoUri(null);
      Alert.alert("Could not analyze this meal", error?.message || "Try another photo in brighter light.");
    } finally { setAnalyzing(false); }
  };

  const choosePhoto = () => Alert.alert("Estimate a meal", "For best results, include the full plate from a slight angle.", [
    { text: "Take photo", onPress: () => scanMeal("camera") },
    { text: "Choose photo", onPress: () => scanMeal("library") },
    { text: "Cancel", style: "cancel" },
  ]);

  const addEstimate = () => {
    if (!analysis) return;
    setMeal((current) => [...current, ...analysis.items.map((item, index) => ({ id: `ai-${Date.now()}-${index}`, name: item.name, serving: item.portionDescription, calories: item.calories, carbs: item.carbs, protein: item.protein, fat: item.fat }))]);
    setAnalysis(null); setPhotoUri(null); setPendingBase64(""); setPortionContext("");
  };

  const refineEstimate = async () => {
    if (!pendingBase64 || !portionContext.trim()) return;
    setAnalyzing(true);
    try { setAnalysis(await analyzeMealPhoto(pendingBase64, `User-provided portion details: ${portionContext.trim()}`)); }
    catch (error: any) { Alert.alert("Could not refine estimate", error?.message || "Please try again."); }
    finally { setAnalyzing(false); }
  };

  return <><ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.eyebrow}><Text style={styles.eyebrowText}>STRICTLYFUEL</Text><View style={styles.dot} /></View>
    <Text style={styles.title}>Fuel the work.</Text><Text style={styles.subtitle}>Build meals, hit your targets, and keep moving with confidence.</Text>
    <View style={styles.hero}><View><Text style={styles.heroLabel}>TODAY'S TARGET</Text><Text style={styles.heroNumber}>2,480 <Text style={styles.heroUnit}>kcal</Text></Text><Text style={styles.heroMeta}>Carbs 310g  ·  Protein 165g</Text></View><Ionicons name="flame" size={42} color={strictlyColors.lime} /></View>
    <Text style={styles.sectionTitle}>Add to your meal</Text>
    <View style={styles.search}><Ionicons name="search" size={19} color={strictlyColors.textSoft} /><TextInput value={query} onChangeText={setQuery} placeholder="Search foods or scan a barcode" placeholderTextColor={strictlyColors.textSoft} style={styles.input} /><TouchableOpacity onPress={() => navigation.navigate("Scan")}><Ionicons name="barcode-outline" size={23} color={strictlyColors.text} /></TouchableOpacity></View>
    {!!query && <View style={styles.results}>{results.map((food) => <TouchableOpacity key={food.id} style={styles.result} onPress={() => { setMeal((current) => [...current, food]); setQuery(""); }}><View><Text style={styles.foodName}>{food.name}</Text><Text style={styles.foodServing}>{food.serving}</Text></View><Text style={styles.resultMacro}>{food.calories} kcal</Text></TouchableOpacity>)}</View>}
    <TouchableOpacity style={styles.aiButton} onPress={choosePhoto}><Ionicons name="sparkles" size={19} color={strictlyColors.text} /><Text style={styles.aiText}>Estimate a meal with AI</Text><Ionicons name="camera-outline" size={19} color={strictlyColors.text} /></TouchableOpacity>
    <View style={styles.mealHeader}><Text style={styles.sectionTitle}>Current meal</Text><Text style={styles.mealCount}>{meal.length} items</Text></View>
    <View style={styles.card}>{meal.map((food, index) => <View key={`${food.id}-${index}`} style={styles.mealRow}><View><Text style={styles.foodName}>{food.name}</Text><Text style={styles.foodServing}>{food.serving}</Text></View><Text style={styles.rowCalories}>{food.calories} kcal</Text></View>)}<View style={styles.divider} /><View style={styles.totalRow}><Text style={styles.totalLabel}>Meal total</Text><Text style={styles.totalValue}>{totals.calories} kcal</Text></View></View>
    <View style={styles.macroGrid}>{[["CARBS", totals.carbs, strictlyColors.lime], ["PROTEIN", totals.protein, strictlyColors.clay], ["FAT", totals.fat, strictlyColors.cream]].map(([label, value, color]) => <View key={String(label)} style={[styles.macro, { borderTopColor: String(color) }]}><Text style={styles.macroLabel}>{label}</Text><Text style={styles.macroValue}>{value}g</Text></View>)}</View>
  </ScrollView>
  <Modal visible={analyzing || !!analysis} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !analyzing && setAnalysis(null)}><ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
    {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}
    {analyzing ? <View style={styles.loading}><ActivityIndicator size="large" color={strictlyColors.text} /><Text style={styles.loadingTitle}>Reading your plate</Text><Text style={styles.loadingBody}>Estimating portions, preparation, and hidden ingredients.</Text></View> : analysis && <>
      <Text style={styles.modalEyebrow}>AI ESTIMATE · {analysis.confidence}% CONFIDENCE</Text><Text style={styles.modalTitle}>{analysis.mealName}</Text>
      <Text style={styles.range}>{analysis.ranges.calories[0]}–{analysis.ranges.calories[1]} kcal likely range</Text>
      <View style={styles.card}>{analysis.items.map((item) => <View key={item.id} style={styles.mealRow}><View style={{ flex: 1 }}><Text style={styles.foodName}>{item.name}</Text><Text style={styles.foodServing}>{item.portionDescription} · {item.confidence}% confidence</Text></View><Text style={styles.rowCalories}>{item.calories} kcal</Text></View>)}</View>
      {!!analysis.followUpQuestion && <View style={styles.questionBlock}><View style={styles.question}><Ionicons name="help-circle-outline" size={20} color={strictlyColors.text} /><Text style={styles.questionText}>{analysis.followUpQuestion}</Text></View><TextInput value={portionContext} onChangeText={setPortionContext} placeholder="Example: 1 cup rice, 6 oz chicken, 1 tsp oil" placeholderTextColor={strictlyColors.textSoft} style={styles.portionInput} /><TouchableOpacity disabled={!portionContext.trim()} style={[styles.refine, !portionContext.trim() && styles.refineDisabled]} onPress={refineEstimate}><Text style={styles.refineText}>Refine with portion details</Text></TouchableOpacity></View>}
      {!!analysis.assumptions.length && <><Text style={styles.assumptionTitle}>ASSUMPTIONS TO CHECK</Text>{analysis.assumptions.map((item) => <Text key={item} style={styles.assumption}>• {item}</Text>)}</>}
      <Text style={styles.disclaimer}>{analysis.disclaimer}</Text>
      <TouchableOpacity style={styles.confirm} onPress={addEstimate}><Text style={styles.confirmText}>Confirm and add to meal</Text></TouchableOpacity>
      <TouchableOpacity style={styles.cancel} onPress={() => { setAnalysis(null); setPhotoUri(null); setPendingBase64(""); setPortionContext(""); }}><Text style={styles.cancelText}>Discard estimate</Text></TouchableOpacity>
    </>}
  </ScrollView></Modal></>;
}

const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:strictlyColors.background},content:{padding:22,paddingBottom:120},eyebrow:{flexDirection:"row",alignItems:"center",gap:8,marginTop:8},eyebrowText:{fontFamily:strictlyType.mono,fontSize:11,letterSpacing:2.3,color:strictlyColors.textSoft},dot:{width:6,height:6,borderRadius:3,backgroundColor:strictlyColors.lime},title:{fontFamily:strictlyType.sansMedium,fontSize:38,color: strictlyColors.text,marginTop:20,letterSpacing:-1.2},subtitle:{color:strictlyColors.textSoft,fontFamily:strictlyType.sans,fontSize:15,lineHeight:22,marginTop:7,maxWidth:320},hero:{backgroundColor:strictlyColors.ink,borderRadius:strictlyRadius.large,padding:22,marginTop:25,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},heroLabel:{color:strictlyColors.sage,fontFamily:strictlyType.mono,fontSize:10,letterSpacing:1.5},heroNumber:{color:"#fff",fontFamily:strictlyType.sansMedium,fontSize:32,marginTop:7},heroUnit:{fontSize:14,color:strictlyColors.sage},heroMeta:{color:"#B6B9B3",fontFamily:strictlyType.sans,fontSize:12,marginTop:8},sectionTitle:{fontFamily:strictlyType.sansMedium,color: strictlyColors.text,fontSize:19,marginTop:27},search:{backgroundColor:strictlyColors.surface,borderWidth:1,borderColor:strictlyColors.border,borderRadius:strictlyRadius.medium,height:54,paddingHorizontal:15,flexDirection:"row",alignItems:"center",gap:10,marginTop:12},input:{flex:1,fontFamily:strictlyType.sans,fontSize:14,color: strictlyColors.text},results:{backgroundColor:strictlyColors.surface,borderRadius:strictlyRadius.medium,marginTop:6,borderWidth:1,borderColor:strictlyColors.border},result:{padding:14,borderBottomWidth:1,borderBottomColor:strictlyColors.border,flexDirection:"row",justifyContent:"space-between"},foodName:{fontFamily:strictlyType.sansMedium,color: strictlyColors.text,fontSize:15},foodServing:{fontFamily:strictlyType.sans,color:strictlyColors.textSoft,fontSize:12,marginTop:3},resultMacro:{color:strictlyColors.textSoft,fontFamily:strictlyType.mono,fontSize:11},aiButton:{marginTop:12,padding:15,borderRadius:strictlyRadius.medium,backgroundColor:strictlyColors.lime,flexDirection:"row",alignItems:"center",gap:10},aiText:{flex:1,color: strictlyColors.text,fontFamily:strictlyType.sansMedium,fontSize:14},mealHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},mealCount:{marginTop:27,color:strictlyColors.textSoft,fontFamily:strictlyType.mono,fontSize:11},card:{backgroundColor:strictlyColors.surface,borderRadius:strictlyRadius.large,padding:17,marginTop:12,borderWidth:1,borderColor:strictlyColors.border},mealRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:10,gap:12},rowCalories:{fontFamily:strictlyType.sansMedium,color: strictlyColors.text,fontSize:14},divider:{height:1,backgroundColor:strictlyColors.border,marginVertical:7},totalRow:{flexDirection:"row",justifyContent:"space-between"},totalLabel:{fontFamily:strictlyType.sansMedium,color: strictlyColors.text},totalValue:{fontFamily:strictlyType.sansMedium,color: strictlyColors.text},macroGrid:{flexDirection:"row",gap:9,marginTop:12},macro:{flex:1,backgroundColor:strictlyColors.surface,borderRadius:strictlyRadius.medium,padding:13,borderTopWidth:3,borderWidth:1,borderColor:strictlyColors.border},macroLabel:{fontFamily:strictlyType.mono,color:strictlyColors.textSoft,fontSize:9,letterSpacing:1},macroValue:{color: strictlyColors.text,fontFamily:strictlyType.sansMedium,fontSize:20,marginTop:6},modal:{flex:1,backgroundColor:strictlyColors.background},modalContent:{padding:22,paddingBottom:40},photo:{width:"100%",height:240,borderRadius:strictlyRadius.large,backgroundColor:strictlyColors.surfaceMuted},loading:{paddingVertical:55,alignItems:"center"},loadingTitle:{fontFamily:strictlyType.sansMedium,fontSize:22,color: strictlyColors.text,marginTop:20},loadingBody:{fontFamily:strictlyType.sans,color:strictlyColors.textSoft,fontSize:14,marginTop:8,textAlign:"center"},modalEyebrow:{fontFamily:strictlyType.mono,fontSize:10,letterSpacing:1.2,color:strictlyColors.textSoft,marginTop:22},modalTitle:{fontFamily:strictlyType.sansMedium,fontSize:28,color: strictlyColors.text,marginTop:8},range:{fontFamily:strictlyType.sans,color:strictlyColors.textSoft,fontSize:15,marginTop:6},questionBlock:{marginTop:14},question:{flexDirection:"row",gap:10,backgroundColor:strictlyColors.cream,padding:14,borderRadius:strictlyRadius.medium},questionText:{flex:1,fontFamily:strictlyType.sans,color: strictlyColors.text,lineHeight:20},portionInput:{backgroundColor:strictlyColors.surface,borderWidth:1,borderColor:strictlyColors.border,borderRadius:strictlyRadius.medium,padding:14,fontFamily:strictlyType.sans,color: strictlyColors.text,marginTop:8},refine:{backgroundColor:strictlyColors.lime,borderRadius:strictlyRadius.medium,padding:14,alignItems:"center",marginTop:8},refineDisabled:{opacity:.45},refineText:{fontFamily:strictlyType.sansMedium,color: strictlyColors.text},assumptionTitle:{fontFamily:strictlyType.mono,fontSize:10,letterSpacing:1.3,color:strictlyColors.textSoft,marginTop:20,marginBottom:6},assumption:{fontFamily:strictlyType.sans,color:strictlyColors.textSoft,fontSize:13,lineHeight:20},disclaimer:{fontFamily:strictlyType.sans,color:strictlyColors.textSoft,fontSize:11,lineHeight:16,marginTop:18},confirm:{backgroundColor:strictlyColors.ink,padding:17,borderRadius:strictlyRadius.medium,alignItems:"center",marginTop:16},confirmText:{color:"white",fontFamily:strictlyType.sansMedium},cancel:{padding:15,alignItems:"center"},cancelText:{color:strictlyColors.textSoft,fontFamily:strictlyType.sansMedium} });
