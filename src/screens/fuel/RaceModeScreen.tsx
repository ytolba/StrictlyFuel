import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { ValueEditorSheet, DURATION_UNITS } from "../../components/fuel/ValueEditorSheet";
import { loadNutritionProfile } from "../../services/nutritionProfileService";
import { RACES, raceById } from "../../data/races";
import type { FuelInterval, GutTrainingLevel, RaceKind } from "../../types/raceMode";
import { formatDuration } from "../../logic/mealTiming";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";
import type { RacePlanParams } from "./RacePlanScreen";

export default function RaceModeScreen({ navigation }: any) {
  const [raceId, setRaceId] = useState<RaceKind>("half_marathon");
  const [duration, setDuration] = useState(raceById("half_marathon").defaultMinutes);
  const [bodyWeightKg, setBodyWeightKg] = useState(75);
  const [gutTraining, setGutTraining] = useState<GutTrainingLevel>("practiced");
  const [interval, setIntervalMinutes] = useState<FuelInterval>(30);
  const [editingDuration, setEditingDuration] = useState(false);

  useEffect(() => { loadNutritionProfile().then((profile) => profile.bodyWeightKg && setBodyWeightKg(profile.bodyWeightKg)); }, []);

  const chooseRace = (id: RaceKind) => {
    setRaceId(id); setDuration(raceById(id).defaultMinutes);
  };
  const buildPlan = () => {
    const params: RacePlanParams = { raceId, durationMinutes: duration, bodyWeightKg, gutTraining, intervalMinutes: interval };
    navigation.navigate("RacePlan", params);
  };

  return <ScreenShell title="Race Mode" eyebrow="RACE FUEL PLANNER" back onBack={() => navigation.goBack()}>
    <Text style={styles.intro}>Pick the event and your realistic finish time. Strictly turns the research range into a plan you can actually pack and practice.</Text>
    <Text style={styles.sectionLabel}>YOUR EVENT</Text>
    <View style={styles.races}>{RACES.map((item) => <TouchableOpacity key={item.id} onPress={() => chooseRace(item.id)} style={[styles.race, raceId === item.id && styles.raceActive]}><Text style={[styles.raceName, raceId === item.id && styles.raceNameActive]}>{item.shortName}</Text><Text style={[styles.raceDistance, raceId === item.id && styles.raceDistanceActive]}>{item.distance}</Text></TouchableOpacity>)}</View>

    <View style={styles.inputs}>
      <TouchableOpacity style={styles.input} onPress={() => setEditingDuration(true)}><Text style={styles.inputLabel}>ESTIMATED FINISH</Text><Text style={styles.inputValue}>{formatDuration(duration)}</Text><Ionicons name="create-outline" size={16} color={strictlyColors.textSoft} /></TouchableOpacity>
      <View style={styles.input}><Text style={styles.inputLabel}>BODY WEIGHT</Text><Text style={styles.inputValue}>{Math.round(bodyWeightKg)} kg</Text><Ionicons name="person-outline" size={16} color={strictlyColors.textSoft} /></View>
    </View>

    <Text style={styles.sectionLabel}>CARB TOLERANCE</Text>
    <View style={styles.segment}>{(["new", "practiced", "high"] as GutTrainingLevel[]).map((level) => <TouchableOpacity key={level} onPress={() => setGutTraining(level)} style={[styles.segmentItem, gutTraining === level && styles.segmentActive]}><Text style={[styles.segmentText, gutTraining === level && styles.segmentTextActive]}>{level === "new" ? "New to fueling" : level === "practiced" ? "Practiced" : "High intake trained"}</Text></TouchableOpacity>)}</View>
    <Text style={styles.helper}>Choose “high intake trained” only if you already tolerate high carbohydrate rates in long sessions.</Text>

    <Text style={styles.sectionLabel}>FUEL REMINDER RHYTHM</Text>
    <View style={styles.intervalRow}>{([20, 30] as FuelInterval[]).map((value) => <TouchableOpacity key={value} onPress={() => setIntervalMinutes(value)} style={[styles.interval, interval === value && styles.intervalActive]}><Text style={[styles.intervalText, interval === value && styles.intervalTextActive]}>Every {value} min</Text></TouchableOpacity>)}</View>
    <TouchableOpacity style={styles.primary} onPress={buildPlan}><Text style={styles.primaryText}>Build my race plan</Text><Ionicons name="flag" size={18} color={strictlyColors.onLime} /></TouchableOpacity>

    {editingDuration ? <ValueEditorSheet visible label="Estimated finish time" value={duration} units={DURATION_UNITS} unitId="min" helpText="Use your realistic total moving time, including transitions for triathlon." onClose={() => setEditingDuration(false)} onSave={(minutes) => setDuration(Math.max(45, Math.round(minutes)))} /> : null}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  intro: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20 },
  sectionLabel: { marginTop: 23, marginBottom: 8, fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1 },
  races: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, race: { width: "48%", minHeight: 68, padding: 11, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, raceActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime }, raceName: { fontFamily: strictlyType.bold, color: strictlyColors.text, fontSize: 12 }, raceNameActive: { color: strictlyColors.onLime }, raceDistance: { marginTop: 5, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 12 }, raceDistanceActive: { color: strictlyColors.onLimeSoft },
  inputs: { flexDirection: "row", gap: 8, marginTop: 10 }, input: { flex: 1, minHeight: 78, padding: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, inputLabel: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1 }, inputValue: { flex: 1, marginTop: 7, fontFamily: strictlyType.bold, color: strictlyColors.text, fontSize: 18 },
  segment: { flexDirection: "row", padding: 3, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted }, segmentItem: { flex: 1, minHeight: 45, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", borderRadius: 9 }, segmentActive: { backgroundColor: strictlyColors.lime }, segmentText: { textAlign: "center", fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 11 }, segmentTextActive: { color: strictlyColors.onLime, fontFamily: strictlyType.bold }, helper: { marginTop: 7, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14 },
  intervalRow: { flexDirection: "row", gap: 8 }, interval: { flex: 1, height: 44, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, intervalActive: { borderColor: strictlyColors.accentText, backgroundColor: strictlyColors.cream }, intervalText: { fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 11 }, intervalTextActive: { color: strictlyColors.text, fontFamily: strictlyType.bold },
  primary: { minHeight: 56, marginTop: 24, paddingHorizontal: 17, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime }, primaryText: { fontFamily: strictlyType.bold, color: strictlyColors.onLime, fontSize: 14 },
});
