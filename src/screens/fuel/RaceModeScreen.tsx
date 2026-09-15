import React, { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { ValueEditorSheet, DURATION_UNITS } from "../../components/fuel/ValueEditorSheet";
import { loadNutritionProfile } from "../../services/nutritionProfileService";
import { RACES, raceById } from "../../data/races";
import { buildRaceFuelPlan, RACE_FUELING_SOURCES } from "../../logic/raceFueling";
import type { FuelInterval, GutTrainingLevel, RaceKind } from "../../types/raceMode";
import { formatDuration } from "../../logic/mealTiming";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

export default function RaceModeScreen({ navigation }: any) {
  const [raceId, setRaceId] = useState<RaceKind>("half_marathon");
  const race = raceById(raceId);
  const [duration, setDuration] = useState(race.defaultMinutes);
  const [bodyWeightKg, setBodyWeightKg] = useState(75);
  const [gutTraining, setGutTraining] = useState<GutTrainingLevel>("practiced");
  const [interval, setIntervalMinutes] = useState<FuelInterval>(30);
  const [editingDuration, setEditingDuration] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => { loadNutritionProfile().then((profile) => profile.bodyWeightKg && setBodyWeightKg(profile.bodyWeightKg)); }, []);
  const plan = useMemo(() => buildRaceFuelPlan({ race, durationMinutes: duration, bodyWeightKg, gutTraining, intervalMinutes: interval }), [race, duration, bodyWeightKg, gutTraining, interval]);

  const chooseRace = (id: RaceKind) => {
    const next = raceById(id);
    setRaceId(id); setDuration(next.defaultMinutes); setGenerated(false);
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
    <View style={styles.segment}>{(["new", "practiced", "high"] as GutTrainingLevel[]).map((level) => <TouchableOpacity key={level} onPress={() => { setGutTraining(level); setGenerated(false); }} style={[styles.segmentItem, gutTraining === level && styles.segmentActive]}><Text style={[styles.segmentText, gutTraining === level && styles.segmentTextActive]}>{level === "new" ? "New to fueling" : level === "practiced" ? "Practiced" : "High intake trained"}</Text></TouchableOpacity>)}</View>
    <Text style={styles.helper}>Choose “high intake trained” only if you already tolerate high carbohydrate rates in long sessions.</Text>

    <Text style={styles.sectionLabel}>FUEL REMINDER RHYTHM</Text>
    <View style={styles.intervalRow}>{([20, 30] as FuelInterval[]).map((value) => <TouchableOpacity key={value} onPress={() => { setIntervalMinutes(value); setGenerated(false); }} style={[styles.interval, interval === value && styles.intervalActive]}><Text style={[styles.intervalText, interval === value && styles.intervalTextActive]}>Every {value} min</Text></TouchableOpacity>)}</View>
    <TouchableOpacity style={styles.primary} onPress={() => setGenerated(true)}><Text style={styles.primaryText}>{generated ? "Rebuild my race plan" : "Build my race plan"}</Text><Ionicons name="flag" size={18} color={strictlyColors.onLime} /></TouchableOpacity>

    {generated ? <View style={styles.plan}>
      <View style={styles.summary}><Text style={styles.summaryEyebrow}>{plan.race.name.toUpperCase()}</Text><Text style={styles.summaryValue}>{plan.totalTargetCarbs}g</Text><Text style={styles.summaryLabel}>planned during-race carbohydrates</Text><View style={styles.summaryStats}><View><Text style={styles.summaryStatValue}>{plan.totalPackedCarbs}g</Text><Text style={styles.summaryStatLabel}>PACKED</Text></View><View><Text style={styles.summaryStatValue}>{formatDuration(plan.durationMinutes)}</Text><Text style={styles.summaryStatLabel}>EST. TIME</Text></View><View><Text style={styles.summaryStatValue}>{plan.intervalMinutes}m</Text><Text style={styles.summaryStatLabel}>RHYTHM</Text></View></View></View>

      <Text style={styles.planTitle}>Before the start</Text><View style={styles.preRace}><Ionicons name="restaurant-outline" size={20} color={strictlyColors.text} /><View style={styles.preRaceCopy}><Text style={styles.preRaceValue}>About {plan.preRaceCarbs}g carbs</Text><Text style={styles.preRaceText}>Use a familiar low-fat, low-fiber meal roughly 2–3 hours before the start. A small tested top-up close to the gun can be handled in Today.</Text></View></View>

      <Text style={styles.planTitle}>What to pack</Text>
      {plan.segments.map((segment) => <View key={segment.label} style={styles.segmentCard}><View style={styles.segmentHead}><View><Text style={styles.segmentTitle}>{segment.label}</Text><Text style={styles.segmentMeta}>{formatDuration(segment.durationMinutes)} · {segment.rate ? `${segment.rate}g/hour` : "No eating during this segment"}</Text></View><Text style={styles.segmentTarget}>{segment.targetCarbs}g</Text></View>{segment.items.length ? segment.items.map((item) => <View key={item.name} style={styles.packRow}><View style={styles.packCount}><Text style={styles.packCountText}>{item.count}×</Text></View><View style={styles.packCopy}><Text style={styles.packName}>{item.name}</Text><Text style={styles.packNote}>{item.totalCarbs}g total · {item.note}</Text></View></View>) : <Text style={styles.noFuel}>Fuel before the swim. Begin planned intake once you are safely settled on the bike.</Text>}</View>)}

      <Text style={styles.planTitle}>Fuel timeline</Text><View style={styles.timeline}>{plan.timeline.map((stop, index) => <View key={`${stop.minute}-${index}`} style={styles.stop}><View style={styles.stopTime}><Text style={styles.stopTimeText}>{clock(stop.minute)}</Text></View><View style={styles.stopCopy}><Text style={styles.stopTitle}>{stop.label}</Text><Text style={styles.stopText}>Aim for about {stop.carbs}g carbs in this interval.</Text></View></View>)}</View>

      <View style={styles.practice}><Ionicons name="shield-checkmark-outline" size={21} color={strictlyColors.accentText} /><Text style={styles.practiceText}>{plan.evidenceNote}</Text></View>
      <View style={styles.hydration}><Text style={styles.hydrationTitle}>Fluids and sodium stay personal</Text><Text style={styles.hydrationText}>Strictly will not invent an exact hydration number without your tested sweat rate, weather, and course access. Use your rehearsed plan and aid-station map, and avoid forcing fluid beyond thirst.</Text></View>
      <Text style={styles.planTitle}>Research behind the range</Text>{RACE_FUELING_SOURCES.map((source) => <TouchableOpacity key={source.url} style={styles.source} onPress={() => Linking.openURL(source.url)}><Text style={styles.sourceText}>{source.title}</Text><Ionicons name="open-outline" size={15} color={strictlyColors.textSoft} /></TouchableOpacity>)}
      <Text style={styles.disclaimer}>Race Mode is practical sports-nutrition guidance, not medical advice. Athletes with diabetes, GI disease, kidney or cardiovascular conditions, or medication-related needs should use an appropriately qualified clinician or sports dietitian.</Text>
    </View> : null}
    {editingDuration ? <ValueEditorSheet visible label="Estimated finish time" value={duration} units={DURATION_UNITS} unitId="min" helpText="Use your realistic total moving time, including transitions for triathlon." onClose={() => setEditingDuration(false)} onSave={(minutes) => { setDuration(Math.max(45, Math.round(minutes))); setGenerated(false); }} /> : null}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  intro: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20 },
  sectionLabel: { marginTop: 23, marginBottom: 8, fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1 },
  races: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, race: { width: "48%", minHeight: 68, padding: 11, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, raceActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime }, raceName: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 12 }, raceNameActive: { color: strictlyColors.onLime }, raceDistance: { marginTop: 5, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 12 }, raceDistanceActive: { color: strictlyColors.onLimeSoft },
  inputs: { flexDirection: "row", gap: 8, marginTop: 10 }, input: { flex: 1, minHeight: 78, padding: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, inputLabel: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1 }, inputValue: { flex: 1, marginTop: 7, fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 18 },
  segment: { flexDirection: "row", padding: 3, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted }, segmentItem: { flex: 1, minHeight: 45, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", borderRadius: 9 }, segmentActive: { backgroundColor: strictlyColors.lime }, segmentText: { textAlign: "center", fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 11 }, segmentTextActive: { color: strictlyColors.onLime, fontFamily: strictlyType.bold }, helper: { marginTop: 7, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14 },
  intervalRow: { flexDirection: "row", gap: 8 }, interval: { flex: 1, height: 44, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, intervalActive: { borderColor: strictlyColors.accentText, backgroundColor: strictlyColors.cream }, intervalText: { fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 11 }, intervalTextActive: { color: strictlyColors.text, fontFamily: strictlyType.bold },
  primary: { minHeight: 56, marginTop: 17, paddingHorizontal: 17, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime }, primaryText: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 13 },
  plan: { marginTop: 27 }, summary: { padding: 20, borderRadius: strictlyRadius.xlarge, backgroundColor: strictlyColors.ink, borderWidth: 1, borderColor: strictlyColors.border }, summaryEyebrow: { fontFamily: strictlyType.semibold, color: strictlyColors.sage, fontSize: 11, letterSpacing: 1.1 }, summaryValue: { marginTop: 8, fontFamily: strictlyType.bold,  color: strictlyColors.white, fontSize: 48, letterSpacing: -2 }, summaryLabel: { fontFamily: strictlyType.regular, color: strictlyColors.inverseTextSoft, fontSize: 11 }, summaryStats: { marginTop: 18, paddingTop: 15, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: strictlyColors.overlayLine }, summaryStatValue: { fontFamily: strictlyType.bold,  color: strictlyColors.white, fontSize: 14 }, summaryStatLabel: { marginTop: 3, fontFamily: strictlyType.semibold, color: strictlyColors.sage, fontSize: 11, letterSpacing: 1.1 },
  planTitle: { marginTop: 26, marginBottom: 9, fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 19 }, preRace: { flexDirection: "row", gap: 11, padding: 15, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream }, preRaceCopy: { flex: 1 }, preRaceValue: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 14 }, preRaceText: { marginTop: 4, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 15 },
  segmentCard: { marginBottom: 9, padding: 15, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, segmentHead: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, segmentTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 16 }, segmentMeta: { marginTop: 3, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11 }, segmentTarget: { fontFamily: strictlyType.bold,  color: strictlyColors.accentText, fontSize: 17 }, packRow: { flexDirection: "row", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: strictlyColors.border }, packCount: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.lime }, packCountText: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 12 }, packCopy: { flex: 1 }, packName: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 12, textTransform: "capitalize" }, packNote: { marginTop: 3, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14 }, noFuel: { marginTop: 12, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 15 },
  timeline: { borderRadius: strictlyRadius.large, overflow: "hidden", borderWidth: 1, borderColor: strictlyColors.border }, stop: { minHeight: 61, padding: 11, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: strictlyColors.surface, borderBottomWidth: 1, borderBottomColor: strictlyColors.border }, stopTime: { width: 53, height: 34, borderRadius: strictlyRadius.pill, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.cream }, stopTimeText: { fontFamily: strictlyType.semibold, color: strictlyColors.text, fontSize: 11 }, stopCopy: { flex: 1 }, stopTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 11 }, stopText: { marginTop: 2, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11 },
  practice: { marginTop: 13, flexDirection: "row", gap: 10, padding: 15, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream }, practiceText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11, lineHeight: 16 }, hydration: { marginTop: 9, padding: 15, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border }, hydrationTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 12 }, hydrationText: { marginTop: 4, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 15 },
  source: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, marginBottom: 7, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface }, sourceText: { flex: 1, fontFamily: strictlyType.medium, color: strictlyColors.text, fontSize: 11 }, disclaimer: { marginTop: 12, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 13, textAlign: "center" },
});
