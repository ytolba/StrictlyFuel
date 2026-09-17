import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ResearchSource } from "../../data/researchSources";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

/** Sources behind a target, shown on every screen that gives nutrition guidance. */
export function Citations({ sources, title = "Research behind this guidance", note }: { sources: ResearchSource[]; title?: string; note?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {sources.map((source) => (
        <TouchableOpacity key={source.url + source.title} style={styles.source} activeOpacity={0.8} accessibilityRole="link" onPress={() => Linking.openURL(source.url)}>
          <View style={styles.copy}>
            <Text style={styles.sourceTitle}>{source.title}</Text>
            <Text style={styles.sourceDetail}>{source.detail}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={strictlyColors.textSoft} />
        </TouchableOpacity>
      ))}
      <Text style={styles.disclaimer}>StrictlyFuel gives general sports-nutrition education, not medical advice. Individual needs and gastrointestinal tolerance vary. Speak with a qualified clinician or sports dietitian about medical conditions.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  title: { fontFamily: strictlyType.bold, color: strictlyColors.text, fontSize: 17, marginBottom: 4 },
  note: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  source: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13, marginTop: 8, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  copy: { flex: 1, paddingVertical: 10 },
  sourceTitle: { fontFamily: strictlyType.semibold, color: strictlyColors.text, fontSize: 12, lineHeight: 17 },
  sourceDetail: { marginTop: 2, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 15 },
  disclaimer: { marginTop: 12, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16 },
});
