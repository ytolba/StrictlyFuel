import React from "react";
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

/** Small uppercase wayfinding label: the app's version of the site's `.overline`. */
export function Overline({ children, accent = false, style }: { children: React.ReactNode; accent?: boolean; style?: TextStyle }) {
  return <Text style={[styles.overline, accent && styles.overlineAccent, style]}>{children}</Text>;
}

/**
 * Numbered section heading from the strictlyinc.com calculator: a step index, an
 * overline, and a title. Steps follow the order the athlete moves through a plan.
 */
export function SectionIntro({ step, overline, title, detail, style }: { step: string; overline: string; title: string; detail?: string; style?: ViewStyle }) {
  return (
    <View style={[styles.intro, style]}>
      <View style={styles.step}><Text style={styles.stepText}>{step}</Text></View>
      <View style={styles.introCopy}>
        <Overline>{overline}</Overline>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

/** Every calculated number is labeled as an estimate (product principle 2). */
export function EstimateBadge({ onLime = false }: { onLime?: boolean }) {
  return <View style={[styles.badge, onLime && styles.badgeOnLime]}><Text style={[styles.badgeText, onLime && styles.badgeTextOnLime]}>ESTIMATE</Text></View>;
}

const styles = StyleSheet.create({
  overline: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 15, letterSpacing: 1.4, textTransform: "uppercase" },
  overlineAccent: { color: strictlyColors.accentText },
  intro: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginTop: 30, marginBottom: 14 },
  step: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: strictlyColors.borderStrong, alignItems: "center", justifyContent: "center", marginTop: 2 },
  stepText: { fontFamily: strictlyType.semibold, color: strictlyColors.text, fontSize: 13, fontVariant: ["tabular-nums"] },
  introCopy: { flex: 1, gap: 5 },
  title: { fontFamily: strictlyType.bold, color: strictlyColors.text, fontSize: 26, lineHeight: 30, letterSpacing: -0.9 },
  detail: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 14, lineHeight: 21, marginTop: 2 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.inverseOverlay, borderWidth: 1, borderColor: strictlyColors.border },
  badgeOnLime: { backgroundColor: strictlyColors.onAccentOverlay, borderColor: "transparent" },
  badgeText: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1 },
  badgeTextOnLime: { color: strictlyColors.onLime },
});
