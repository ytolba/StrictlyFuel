import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const SPEEDS = [
  { key: "fast", label: "Fast", color: strictlyColors.lime },
  { key: "medium", label: "Medium", color: "#A7BFA9" },
  { key: "slow", label: "Slow", color: "#D8D5C8" },
] as const;

export function CarbSpeedBar({ fast, medium, slow, compact = false }: { fast: number; medium: number; slow: number; compact?: boolean }) {
  const total = Math.max(1, fast + medium + slow);
  return <View>
    <View style={[styles.bar, compact && styles.compactBar]}>
      {SPEEDS.map((speed) => {
        const value = speed.key === "fast" ? fast : speed.key === "medium" ? medium : slow;
        return value > 0 ? <View key={speed.key} style={{ flex: value / total, backgroundColor: speed.color }} /> : null;
      })}
    </View>
    <View style={styles.labels}>{SPEEDS.map((speed) => {
      const value = speed.key === "fast" ? fast : speed.key === "medium" ? medium : slow;
      return <View key={speed.key} style={styles.labelItem}><View style={[styles.dot, { backgroundColor: speed.color }]} /><Text style={styles.label}>{speed.label} <Text style={styles.value}>{Math.round(value)}g</Text></Text></View>;
    })}</View>
  </View>;
}

const styles = StyleSheet.create({
  bar: { height: 9, borderRadius: strictlyRadius.pill, overflow: "hidden", flexDirection: "row", backgroundColor: strictlyColors.surfaceMuted },
  compactBar: { height: 6 },
  labels: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  labelItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontFamily: strictlyType.sans, fontSize: 11, color: strictlyColors.textSoft },
  value: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink },
});

