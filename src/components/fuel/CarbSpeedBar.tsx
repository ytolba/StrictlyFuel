import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { carbSpeedMeta, strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const ORDER = ["fast", "medium", "slow"] as const;
type Speed = (typeof ORDER)[number];

export type CarbSpeedBarProps = {
  fast: number;
  medium: number;
  slow: number;
  /** Compact renders just the bar plus a single inline legend line. */
  compact?: boolean;
  /** Shows the one-line explanation of what each speed means. */
  showHints?: boolean;
  /** When supplied, each speed is compared against this target split. */
  target?: { fast: number; medium: number; slow: number };
  /** Rendering on a dark high-emphasis card rather than a normal surface. */
  onDark?: boolean;
};

const valueFor = (speed: Speed, fast: number, medium: number, slow: number) =>
  speed === "fast" ? fast : speed === "medium" ? medium : slow;

export function CarbSpeedBar({ fast, medium, slow, compact = false, showHints = false, target, onDark = false }: CarbSpeedBarProps) {
  const total = fast + medium + slow;
  const safeTotal = Math.max(1, total);

  return (
    <View>
      <View style={[styles.bar, compact && styles.barCompact]}>
        {total <= 0 ? (
          <View style={styles.barEmpty} />
        ) : (
          ORDER.map((speed) => {
            const value = valueFor(speed, fast, medium, slow);
            if (value <= 0) return null;
            return <View key={speed} style={{ flex: value / safeTotal, backgroundColor: carbSpeedMeta[speed].color }} />;
          })
        )}
      </View>

      {compact ? (
        <View style={styles.inlineLegend}>
          {ORDER.map((speed) => {
            const value = valueFor(speed, fast, medium, slow);
            return (
              <View key={speed} style={styles.inlineItem}>
                <View style={[styles.dot, { backgroundColor: carbSpeedMeta[speed].color }]} />
                <Text style={[styles.inlineText, onDark && styles.onDarkSoft]}>
                  {carbSpeedMeta[speed].label} <Text style={[styles.inlineValue, onDark && styles.onDarkStrong]}>{Math.round(value)}g</Text>
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.rows}>
          {ORDER.map((speed) => {
            const value = valueFor(speed, fast, medium, slow);
            const share = Math.round((value / safeTotal) * 100);
            const goal = target ? valueFor(speed, target.fast, target.medium, target.slow) : null;
            const delta = goal === null ? 0 : Math.round(value - goal);
            return (
              <View key={speed} style={[styles.row, onDark && styles.rowOnDark]}>
                <View style={[styles.stripe, { backgroundColor: carbSpeedMeta[speed].color }]} />
                <View style={styles.rowCopy}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowLabel, onDark && styles.onDarkStrong]}>{carbSpeedMeta[speed].label} carbs</Text>
                    <Text style={[styles.rowValue, onDark && styles.onDarkStrong]}>
                      {Math.round(value)}g <Text style={[styles.rowShare, onDark && styles.onDarkSoft]}>· {share}%</Text>
                    </Text>
                  </View>
                  {goal !== null ? (
                    <Text style={[styles.rowTarget, onDark && styles.onDarkSoft]}>
                      Target {Math.round(goal)}g{" "}
                      {Math.abs(delta) <= 3 ? (
                        <Text style={styles.onTrack}>· on track</Text>
                      ) : (
                        <Text style={styles.offTrack}>· {delta > 0 ? `${delta}g over` : `${Math.abs(delta)}g short`}</Text>
                      )}
                    </Text>
                  ) : null}
                  {showHints ? <Text style={[styles.rowHint, onDark && styles.onDarkSoft]}>{carbSpeedMeta[speed].hint}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 12, borderRadius: strictlyRadius.pill, overflow: "hidden", flexDirection: "row", backgroundColor: strictlyColors.surfaceMuted },
  barCompact: { height: 7 },
  barEmpty: { flex: 1, backgroundColor: strictlyColors.surfaceMuted },

  inlineLegend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  inlineItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  inlineText: { fontFamily: strictlyType.sans, fontSize: 11, color: strictlyColors.textSoft },
  inlineValue: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text },

  rows: { marginTop: 12, gap: 7 },
  row: { flexDirection: "row", gap: 11, padding: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  rowOnDark: { backgroundColor: "rgba(255,255,255,0.06)" },
  stripe: { width: 4, borderRadius: 2 },
  rowCopy: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  rowLabel: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 13 },
  rowValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 14 },
  rowShare: { fontFamily: strictlyType.mono, fontWeight: "400", color: strictlyColors.textSoft, fontSize: 10 },
  rowTarget: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, marginTop: 4 },
  onTrack: { color: strictlyColors.good, fontFamily: strictlyType.sansMedium, fontWeight: "700" },
  offTrack: { color: strictlyColors.clay, fontFamily: strictlyType.sansMedium, fontWeight: "700" },
  rowHint: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 4 },

  onDarkStrong: { color: strictlyColors.white },
  onDarkSoft: { color: strictlyColors.sage },
});
