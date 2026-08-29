import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FuelTarget, WorkoutDraft } from "../../types/fuel";
import { getActivity } from "../../data/activities";
import { formatDuration } from "../../logic/mealTiming";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";
import { CarbSpeedBar } from "./CarbSpeedBar";

export function FuelTargetCard({ target, workout, dark = true }: { target: FuelTarget; workout: WorkoutDraft; dark?: boolean }) {
  const activity = getActivity(workout.activityType);
  return (
    <View style={[styles.card, dark ? styles.dark : styles.light]}>
      <View style={styles.top}>
        <View style={styles.topCopy}>
          <Text style={[styles.eyebrow, !dark && styles.eyebrowLight]}>YOUR FUEL TARGET</Text>
          <Text style={[styles.workout, !dark && styles.textLight]} numberOfLines={1}>
            {formatDuration(workout.durationMinutes)} {activity.shortLabel}
          </Text>
        </View>
        <View style={[styles.time, !dark && styles.timeLight]}>
          <Ionicons name="time-outline" size={14} color={dark ? strictlyColors.lime : strictlyColors.text} />
          <Text style={[styles.timeText, !dark && styles.textLight]}>in {formatDuration(workout.startsInMinutes)}</Text>
        </View>
      </View>

      <Text style={[styles.number, !dark && styles.textLight]}>
        {target.carbTarget}
        <Text style={styles.unit}> g carbs</Text>
      </Text>
      <Text style={[styles.range, !dark && styles.rangeLight]}>
        {target.carbRange[0]}–{target.carbRange[1]} g working range · {target.timingLabel}
      </Text>

      <View style={styles.speed}>
        <Text style={[styles.speedTitle, !dark && styles.eyebrowLight]}>HOW THOSE CARBS SHOULD SPLIT</Text>
        <CarbSpeedBar
          fast={target.fastCarbs}
          medium={target.mediumCarbs}
          slow={target.slowCarbs}
          onDark={dark}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: strictlyRadius.large, padding: 20 },
  dark: { backgroundColor: strictlyColors.ink },
  light: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  topCopy: { flex: 1 },
  eyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.sage, fontSize: 9, letterSpacing: 1.5 },
  eyebrowLight: { color: strictlyColors.textSoft },
  workout: { fontFamily: strictlyType.sansMedium, fontWeight: "600", color: strictlyColors.white, fontSize: 15, marginTop: 6 },
  time: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: strictlyRadius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  timeLight: { backgroundColor: strictlyColors.surfaceMuted },
  timeText: { color: strictlyColors.white, fontFamily: strictlyType.mono, fontSize: 10 },
  number: { fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 46, letterSpacing: -2, color: strictlyColors.white, marginTop: 22 },
  unit: { fontSize: 15, letterSpacing: 0, color: strictlyColors.sage },
  range: { fontFamily: strictlyType.sans, color: strictlyColors.sage, fontSize: 12, marginTop: 4, lineHeight: 17 },
  rangeLight: { color: strictlyColors.textSoft },
  speed: { marginTop: 20 },
  speedTitle: { fontFamily: strictlyType.mono, color: strictlyColors.sage, fontSize: 8, letterSpacing: 1.3, marginBottom: 10 },
  textLight: { color: strictlyColors.text },
});
