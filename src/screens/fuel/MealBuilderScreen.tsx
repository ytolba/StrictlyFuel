import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { searchFuelFoods } from "../../data/fuelFoods";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { calculateMealMacros } from "../../logic/nutritionEngine";
import { saveMeal } from "../../services/fuelService";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { CarbSpeedBar } from "../../components/fuel/CarbSpeedBar";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function MealBuilderScreen({ navigation }: any) {
  const { user } = useAuth();
  const { workout, target, ingredients, addIngredient, updateIngredient, removeIngredient, buildMeal } = useFuel();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("My pre-workout meal");
  const macros = useMemo(() => calculateMealMacros(ingredients), [ingredients]);
  const results = useMemo(() => searchFuelFoods(query), [query]);

  const analyze = () => {
    if (!ingredients.length) return Alert.alert("Add a food first", "Build the meal you plan to eat, then Strictly can score it.");
    const meal = buildMeal(user?.uid || "local", name);
    if (!meal) return;
    if (user?.uid) saveMeal(user.uid, meal).catch(() => undefined);
    navigation.navigate("MealAnalysis", { mealId: meal.id });
  };

  if (!workout || !target) return <ScreenShell title="Build meal" back onBack={() => navigation.goBack()}><Text style={styles.empty}>Calculate a workout before building a meal.</Text></ScreenShell>;
  return <ScreenShell title="Build your meal" eyebrow={`${target.carbTarget} G TARGET`} back onBack={() => navigation.goBack()}>
    <View style={styles.targetMini}><View><Text style={styles.targetLabel}>TARGET</Text><Text style={styles.targetValue}>{target.carbTarget}g</Text></View><View style={styles.targetProgress}><View style={[styles.targetFill, { width: `${Math.min(100, macros.carbs / Math.max(1, target.carbTarget) * 100)}%` }]} /></View><Text style={styles.actual}>{Math.round(macros.carbs)}g</Text></View>

    <TextInput value={name} onChangeText={setName} style={styles.nameInput} placeholder="Meal name" placeholderTextColor={strictlyColors.textSoft} />
    <View style={styles.search}><Ionicons name="search" size={18} color={strictlyColors.textSoft} /><TextInput value={query} onChangeText={setQuery} style={styles.searchInput} placeholder="Search banana, rice, honey…" placeholderTextColor={strictlyColors.textSoft} /></View>
    {query ? <View style={styles.results}>{results.map((food) => <TouchableOpacity key={food.id} onPress={() => { addIngredient({ food, grams: food.defaultGrams }); setQuery(""); }} style={styles.result}><Text style={styles.foodEmoji}>{food.emoji}</Text><View style={styles.foodCopy}><Text style={styles.foodName}>{food.name}</Text><Text style={styles.foodMeta}>{food.servingLabel} · {food.carbSpeed} digesting</Text></View><View style={styles.add}><Ionicons name="add" size={19} color={strictlyColors.ink} /></View></TouchableOpacity>)}</View> : null}

    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Meal</Text><Text style={styles.count}>{ingredients.length} items</Text></View>
    {!ingredients.length ? <View style={styles.emptyCard}><Text style={styles.emptyIcon}>＋</Text><Text style={styles.emptyTitle}>Start with one food</Text><Text style={styles.emptyText}>Search above or scan your plate instead.</Text></View> : <View style={styles.items}>{ingredients.map((item) => <View key={item.id} style={styles.item}>
      <Text style={styles.foodEmoji}>{item.food.emoji}</Text><View style={styles.foodCopy}><Text style={styles.foodName}>{item.food.name}</Text><Text style={styles.foodMeta}>{Math.round(item.food.per100g.carbs * item.grams / 100)}g carbs · {item.food.carbSpeed}</Text></View>
      <View style={styles.stepper}><TouchableOpacity onPress={() => updateIngredient(item.id, { grams: Math.max(1, item.grams - 10) })} style={styles.step}><Text>−</Text></TouchableOpacity><TextInput value={String(Math.round(item.grams))} onChangeText={(value) => updateIngredient(item.id, { grams: Math.max(1, Number(value) || 1) })} keyboardType="number-pad" style={styles.grams} /><Text style={styles.g}>g</Text><TouchableOpacity onPress={() => updateIngredient(item.id, { grams: item.grams + 10 })} style={styles.step}><Text>+</Text></TouchableOpacity></View>
      <TouchableOpacity onPress={() => removeIngredient(item.id)} style={styles.remove}><Ionicons name="close" size={16} color={strictlyColors.textSoft} /></TouchableOpacity>
    </View>)}</View>}

    <Text style={styles.sectionTitle}>Target vs meal</Text>
    <View style={styles.compare}>
      <View style={styles.compareHead}><Text style={styles.compareLabel}> </Text><Text style={styles.compareLabel}>TARGET</Text><Text style={styles.compareLabel}>MEAL</Text></View>
      {[{ label: "Total carbs", target: target.carbTarget, meal: macros.carbs }, { label: "Fast", target: target.fastCarbs, meal: macros.fastCarbs }, { label: "Medium", target: target.mediumCarbs, meal: macros.mediumCarbs }, { label: "Slow", target: target.slowCarbs, meal: macros.slowCarbs }].map((row) => <View key={row.label} style={styles.compareRow}><Text style={styles.compareName}>{row.label}</Text><Text style={styles.compareNumber}>{Math.round(row.target)}g</Text><Text style={[styles.compareNumber, Math.abs(row.target - row.meal) <= Math.max(5, row.target * 0.2) && styles.onTarget]}>{Math.round(row.meal)}g</Text></View>)}
      <CarbSpeedBar fast={macros.fastCarbs} medium={macros.mediumCarbs} slow={macros.slowCarbs} />
    </View>

    <View style={styles.macros}>{[["Calories", `${Math.round(macros.calories)}`], ["Protein", `${Math.round(macros.protein)}g`], ["Fat", `${Math.round(macros.fat)}g`], ["Fiber", `${Math.round(macros.fiber)}g`]].map(([label, value]) => <View key={label} style={styles.macro}><Text style={styles.macroValue}>{value}</Text><Text style={styles.macroLabel}>{label}</Text></View>)}</View>
    <TouchableOpacity style={[styles.primary, !ingredients.length && styles.disabled]} disabled={!ingredients.length} onPress={analyze}><Text style={styles.primaryText}>Score this meal</Text><Ionicons name="arrow-forward" size={18} color={strictlyColors.ink} /></TouchableOpacity>
    <Text style={styles.source}>Generic food values use a curated USDA-based starter catalog. A package label should replace generic data for branded products.</Text>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  empty: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft },
  targetMini: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.large, padding: 15 },
  targetLabel: { fontFamily: strictlyType.mono, color: strictlyColors.sage, fontSize: 8, letterSpacing: 1 },
  targetValue: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.white, fontSize: 20, marginTop: 2 },
  targetProgress: { flex: 1, height: 7, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden" },
  targetFill: { height: "100%", backgroundColor: strictlyColors.lime },
  actual: { minWidth: 42, textAlign: "right", fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.white, fontSize: 16 },
  nameInput: { height: 50, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, paddingHorizontal: 14, color: strictlyColors.ink, fontFamily: strictlyType.sansMedium, marginTop: 12 },
  search: { height: 52, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, paddingHorizontal: 14, marginTop: 9 },
  searchInput: { flex: 1, color: strictlyColors.ink, fontFamily: strictlyType.sans },
  results: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, marginTop: 6, overflow: "hidden" },
  result: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  foodEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  foodCopy: { flex: 1 },
  foodName: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 13 },
  foodMeta: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, marginTop: 3, textTransform: "capitalize" },
  add: { width: 30, height: 30, borderRadius: 15, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 25, marginBottom: 9 },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 18, marginTop: 24, marginBottom: 9 },
  count: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9 },
  items: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: strictlyColors.surfaceMuted, borderRadius: 9, padding: 3 },
  step: { width: 26, height: 28, alignItems: "center", justifyContent: "center" },
  grams: { width: 35, textAlign: "right", padding: 0, color: strictlyColors.ink, fontFamily: strictlyType.sansMedium, fontSize: 12 },
  g: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, marginRight: 2 },
  remove: { marginLeft: 5, width: 24, height: 28, alignItems: "center", justifyContent: "center" },
  emptyCard: { alignItems: "center", padding: 28, borderWidth: 1, borderColor: strictlyColors.border, borderStyle: "dashed", borderRadius: strictlyRadius.large },
  emptyIcon: { fontSize: 25, color: strictlyColors.ink },
  emptyTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, marginTop: 8 },
  emptyText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginTop: 4 },
  compare: { padding: 15, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large },
  compareHead: { flexDirection: "row", paddingBottom: 7 },
  compareLabel: { flex: 1, textAlign: "right", fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 0.8 },
  compareRow: { flexDirection: "row", paddingVertical: 8, borderTopWidth: 1, borderTopColor: strictlyColors.border },
  compareName: { flex: 1, fontFamily: strictlyType.sansMedium, color: strictlyColors.ink, fontSize: 12 },
  compareNumber: { flex: 1, textAlign: "right", fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 12 },
  onTarget: { color: strictlyColors.good, fontWeight: "800" },
  macros: { flexDirection: "row", gap: 7, marginTop: 10 },
  macro: { flex: 1, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, alignItems: "center", paddingVertical: 12 },
  macroValue: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 15 },
  macroLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, textTransform: "uppercase", marginTop: 3 },
  primary: { height: 56, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink },
  disabled: { opacity: 0.4 },
  source: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 11 },
});

