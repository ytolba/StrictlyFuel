import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FuelTarget, WorkoutDraft } from "../../types/fuel";
import { getActivity } from "../../data/activities";
import { formatDuration } from "../../logic/mealTiming";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";
import { CarbSpeedBar } from "./CarbSpeedBar";
import { EstimateBadge, Overline } from "./Section";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/** The site's "Your result" card: an estimate label, the carb number in lime, and when to eat. */
export function FuelTargetCard({ target, workout, dark = true }: { target: FuelTarget; workout: WorkoutDraft; dark?: boolean }) {
  const activity = getActivity(workout.activityType);
  const reducedMotion = useReducedMotion();
  const numberScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    numberScale.stopAnimation();
    if (reducedMotion) { numberScale.setValue(1); return; }
    numberScale.setValue(0.94);
    const animation = Animated.timing(numberScale, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [numberScale, reducedMotion, target.carbTarget]);
  return (
    <View style={[styles.card, dark ? styles.dark : styles.light]}>
      <View style={styles.top}>
        <Overline>Your result</Overline>
        <EstimateBadge />
      </View>
      <Text style={styles.context} numberOfLines={2}>
        Recommended before your {formatDuration(workout.durationMinutes)} {activity.shortLabel.toLowerCase()} · {workout.intensity}
      </Text>

      <Animated.Text style={[styles.number, !dark && styles.numberLight, { transform: [{ scale: numberScale }] }]} accessibilityLabel={`${target.carbTarget} grams of carbs`}>
        {target.carbTarget}
        <Text style={styles.unit}> g carbs</Text>
      </Animated.Text>
      <Text style={styles.range}>Working range {target.carbRange[0]}–{target.carbRange[1]} g</Text>

      <View style={[styles.timing, !dark && styles.timingLight]}>
        <Ionicons name="time-outline" size={16} color={strictlyColors.accentText} />
        <Text style={styles.timingLabel}>Best timing</Text>
        <Text style={styles.timingValue} numberOfLines={2}>{target.timingLabel}</Text>
      </View>
      <Text style={styles.startsIn}>Your session starts in {formatDuration(workout.startsInMinutes)}.</Text>

      <View style={styles.speed}>
        <Overline style={styles.speedTitle}>How those carbs should split</Overline>
        <CarbSpeedBar fast={target.fastCarbs} medium={target.mediumCarbs} slow={target.slowCarbs} onDark={dark} animate />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: strictlyRadius.xlarge, padding: 20 },
  dark: { backgroundColor: strictlyColors.ink, borderWidth: 1, borderColor: strictlyColors.border },
  light: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  context: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 10 },
  number: { fontFamily: strictlyType.bold, fontSize: 64, lineHeight: 70, letterSpacing: -3, color: strictlyColors.accentText, marginTop: 14, fontVariant: ["tabular-nums"] },
  numberLight: { color: strictlyColors.text },
  unit: { fontFamily: strictlyType.semibold, fontSize: 15, letterSpacing: 0, color: strictlyColors.text },
  range: { fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 13, marginTop: 2 },
  timing: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingHorizontal: 13, marginTop: 18, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.inverseOverlay },
  timingLight: { backgroundColor: strictlyColors.surfaceMuted },
  timingLabel: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 13 },
  timingValue: { flex: 1, textAlign: "right", fontFamily: strictlyType.bold, color: strictlyColors.text, fontSize: 14 },
  startsIn: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 12, marginTop: 8 },
  speed: { marginTop: 20 },
  speedTitle: { marginBottom: 10 },
});
