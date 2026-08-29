import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ActivityType, CommunityFilters } from "../../types/fuel";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

function Choices({ values, selected, onSelect }: { values: [string, string][]; selected?: string | boolean; onSelect: (value: string | undefined) => void }) {
  return <View style={styles.choices}>{values.map(([value, label]) => <TouchableOpacity key={value} onPress={() => onSelect(selected === value ? undefined : value)} style={[styles.choice, selected === value && styles.choiceActive]}><Text style={[styles.choiceText, selected === value && styles.choiceTextActive]}>{label}</Text></TouchableOpacity>)}</View>;
}

export default function CommunityFiltersScreen({ navigation, route }: any) {
  const [filters, setFilters] = useState<CommunityFilters>(route.params?.filters || {});
  return <ScreenShell title="Filter meals" eyebrow="FIND YOUR CONTEXT" back onBack={() => navigation.goBack()}>
    <Text style={styles.label}>ACTIVITY</Text><Choices selected={filters.activityType} onSelect={(value) => setFilters((current) => ({ ...current, activityType: value as ActivityType | undefined }))} values={[["running", "Running"], ["cycling", "Cycling"], ["strength", "Lifting"], ["swimming", "Swimming"], ["hyrox", "Hyrox"], ["crossfit", "CrossFit"]]} />
    <Text style={styles.label}>WORKOUT DURATION</Text><Choices selected={filters.durationBand} onSelect={(value) => setFilters((current) => ({ ...current, durationBand: value as CommunityFilters["durationBand"] }))} values={[["under45", "<45 min"], ["45to90", "45–90 min"], ["90to120", "90 min–2 hr"], ["over120", "2+ hr"]]} />
    <Text style={styles.label}>MEAL TIMING</Text><Choices selected={filters.timingBand} onSelect={(value) => setFilters((current) => ({ ...current, timingBand: value as CommunityFilters["timingBand"] }))} values={[["under30", "<30 min"], ["30to60", "30–60 min"], ["60to120", "1–2 hr"], ["120to180", "2–3 hr"], ["over180", "3+ hr"]]} />
    <Text style={styles.label}>QUALITY</Text><TouchableOpacity onPress={() => setFilters((current) => ({ ...current, highScoreOnly: !current.highScoreOnly }))} style={[styles.toggle, filters.highScoreOnly && styles.toggleActive]}><Text style={[styles.toggleText, filters.highScoreOnly && styles.toggleTextActive]}>Strictly Score 90+</Text></TouchableOpacity>
    <TouchableOpacity style={styles.apply} onPress={() => navigation.navigate("Main", { screen: "Discover", params: { filters } })}><Text style={styles.applyText}>Show matching meals</Text></TouchableOpacity>
    <TouchableOpacity style={styles.clear} onPress={() => setFilters({})}><Text style={styles.clearText}>Clear all filters</Text></TouchableOpacity>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  label: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9, letterSpacing: 1.3, marginTop: 21, marginBottom: 9 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  choiceActive: { backgroundColor: strictlyColors.ink, borderColor: strictlyColors.ink },
  choiceText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.text, fontSize: 11 },
  choiceTextActive: { color: strictlyColors.white },
  toggle: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 11, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  toggleActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime },
  toggleText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.text, fontSize: 11 },
  toggleTextActive: { fontWeight: "800", color: strictlyColors.onLime },
  apply: { height: 55, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, marginTop: 30 },
  applyText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime },
  clear: { height: 47, alignItems: "center", justifyContent: "center" },
  clearText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 11 },
});

