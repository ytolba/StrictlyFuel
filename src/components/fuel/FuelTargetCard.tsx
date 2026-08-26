import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FuelTarget, WorkoutDraft } from "../../types/fuel";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";
import { CarbSpeedBar } from "./CarbSpeedBar";

export function FuelTargetCard({ target, workout, dark = true }: { target: FuelTarget; workout: WorkoutDraft; dark?: boolean }) {
  return <View style={[styles.card, dark ? styles.dark : styles.light]}>
    <View style={styles.top}><View><Text style={[styles.eyebrow, !dark && styles.darkText]}>YOUR FUEL TARGET</Text><Text style={[styles.workout, !dark && styles.darkText]}>{workout.durationMinutes}-min {workout.activityType}</Text></View><View style={[styles.time, !dark && styles.timeLight]}><Ionicons name="time-outline" size={14} color={dark ? strictlyColors.lime : strictlyColors.ink} /><Text style={[styles.timeText, !dark && styles.darkText]}>{workout.startsInMinutes} min</Text></View></View>
    <Text style={[styles.number, !dark && styles.darkText]}>{target.carbTarget}<Text style={styles.unit}> g carbs</Text></Text>
    <Text style={[styles.range, !dark && styles.rangeLight]}>{target.carbRange[0]}–{target.carbRange[1]} g working range</Text>
    <View style={styles.speed}><CarbSpeedBar fast={target.fastCarbs} medium={target.mediumCarbs} slow={target.slowCarbs} /></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: strictlyRadius.large, padding: 20 },
  dark: { backgroundColor: strictlyColors.ink },
  light: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.sage, fontSize: 9, letterSpacing: 1.5 },
  workout: { fontFamily: strictlyType.sansMedium, fontWeight: "600", color: strictlyColors.white, fontSize: 15, marginTop: 6, textTransform: "capitalize" },
  time: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: strictlyRadius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  timeLight: { backgroundColor: strictlyColors.surfaceMuted },
  timeText: { color: strictlyColors.white, fontFamily: strictlyType.mono, fontSize: 10 },
  number: { fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 46, letterSpacing: -2, color: strictlyColors.white, marginTop: 22 },
  unit: { fontSize: 15, letterSpacing: 0, color: strictlyColors.sage },
  range: { fontFamily: strictlyType.sans, color: "#B8C3BA", fontSize: 12, marginTop: 2 },
  rangeLight: { color: strictlyColors.textSoft },
  speed: { marginTop: 18 },
  darkText: { color: strictlyColors.ink },
});

