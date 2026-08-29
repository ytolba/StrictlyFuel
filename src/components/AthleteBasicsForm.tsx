import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NutritionProfile } from "../types/nutritionProfile";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type Props = { profile: NutritionProfile; onChange: (profile: NutritionProfile) => void };
const pounds = (kg: number | null) => kg ? Math.round(kg * 2.20462) : 0;
const feet = (cm: number | null) => cm ? Math.floor(cm / 30.48) : 0;
const inches = (cm: number | null) => cm ? Math.round(cm / 2.54 - feet(cm) * 12) : 0;
const number = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;

export function AthleteBasicsForm({ profile, onChange }: Props) {
  const imperial = profile.measurementSystem === "imperial";
  const update = (changes: Partial<NutritionProfile>) => onChange({ ...profile, ...changes });
  return <View>
    <Text style={styles.eyebrow}>YOUR BASELINE</Text>
    <Text style={styles.title}>Personalize the target once.</Text>
    <Text style={styles.description}>Weight meaningfully changes carbohydrate needs. Height is only used as a body-size reasonableness check, not as a major scoring input.</Text>
    <View style={styles.switch}>{(["imperial", "metric"] as const).map((unit) => <TouchableOpacity key={unit} onPress={() => update({ measurementSystem: unit })} style={[styles.switchItem, profile.measurementSystem === unit && styles.switchActive]}><Text style={[styles.switchText, profile.measurementSystem === unit && styles.switchTextActive]}>{unit}</Text></TouchableOpacity>)}</View>
    <Text style={styles.label}>WEIGHT</Text>
    <View style={styles.inputWrap}><TextInput value={profile.bodyWeightKg ? String(imperial ? pounds(profile.bodyWeightKg) : Math.round(profile.bodyWeightKg * 10) / 10) : ""} onChangeText={(value) => update({ bodyWeightKg: number(value) ? (imperial ? number(value) / 2.20462 : number(value)) : null })} keyboardType="decimal-pad" placeholder={imperial ? "165" : "75"} placeholderTextColor={strictlyColors.textSoft} selectTextOnFocus style={styles.input} /><Text style={styles.unit}>{imperial ? "lb" : "kg"}</Text></View>
    <Text style={styles.label}>HEIGHT</Text>
    {imperial ? <View style={styles.heightRow}><View style={styles.inputWrap}><TextInput value={profile.heightCm ? String(feet(profile.heightCm)) : ""} onChangeText={(value) => update({ heightCm: (number(value) * 12 + inches(profile.heightCm)) * 2.54 || null })} keyboardType="number-pad" placeholder="5" placeholderTextColor={strictlyColors.textSoft} selectTextOnFocus style={styles.input} /><Text style={styles.unit}>ft</Text></View><View style={styles.inputWrap}><TextInput value={profile.heightCm ? String(inches(profile.heightCm)) : ""} onChangeText={(value) => update({ heightCm: (feet(profile.heightCm) * 12 + Math.min(11, number(value))) * 2.54 || null })} keyboardType="number-pad" placeholder="10" placeholderTextColor={strictlyColors.textSoft} selectTextOnFocus style={styles.input} /><Text style={styles.unit}>in</Text></View></View> : <View style={styles.inputWrap}><TextInput value={profile.heightCm ? String(Math.round(profile.heightCm)) : ""} onChangeText={(value) => update({ heightCm: number(value) || null })} keyboardType="decimal-pad" placeholder="178" placeholderTextColor={strictlyColors.textSoft} selectTextOnFocus style={styles.input} /><Text style={styles.unit}>cm</Text></View>}
    <View style={styles.healthCard}><View style={styles.healthIcon}><Ionicons name="leaf-outline" size={19} color={strictlyColors.onLime} /></View><View style={styles.healthCopy}><Text style={styles.healthTitle}>Every meal gets a health rating</Text><Text style={styles.healthText}>Shown alongside your Fuel Score, with suggestions for raising it. Fuel Score always stays workout-specific and is never changed by it.</Text></View></View>
  </View>;
}

const styles = StyleSheet.create({
  eyebrow: { color: strictlyColors.good, fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.2 }, title: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 27, letterSpacing: -0.8, marginTop: 8 }, description: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 13, lineHeight: 20, marginTop: 8 },
  switch: { flexDirection: "row", padding: 4, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted, marginTop: 20 }, switchItem: { flex: 1, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 9 }, switchActive: { backgroundColor: strictlyColors.ink }, switchText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sansMedium, fontSize: 12, textTransform: "capitalize" }, switchTextActive: { color: strictlyColors.lime, fontWeight: "800" },
  label: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.2, marginTop: 18, marginBottom: 7 }, heightRow: { flexDirection: "row", gap: 9 }, inputWrap: { flex: 1, height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.borderStrong }, input: { flex: 1, color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 21 }, unit: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 10 },
  healthCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginTop: 22, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream }, healthIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" }, healthCopy: { flex: 1 }, healthTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 12 }, healthText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 9, lineHeight: 14, marginTop: 3 }, toggle: { width: 46, height: 28, borderRadius: 14, padding: 3, backgroundColor: strictlyColors.borderStrong }, toggleActive: { backgroundColor: strictlyColors.ink }, toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: strictlyColors.white }, toggleKnobActive: { alignSelf: "flex-end", backgroundColor: strictlyColors.lime },
});
