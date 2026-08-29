import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ACTIVITY_CATALOG, ACTIVITY_CATEGORIES, getActivity, searchActivities } from "../../data/activities";
import type { ActivityType } from "../../types/fuel";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type Props = {
  visible: boolean;
  selected: ActivityType;
  favorites: ActivityType[];
  recents: ActivityType[];
  onClose: () => void;
  onSelect: (activity: ActivityType) => void;
  onToggleFavorite: (activity: ActivityType) => void;
};

export function ActivityPickerSheet({ visible, selected, favorites, recents, onClose, onSelect, onToggleFavorite }: Props) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchActivities(query), [query]);
  const recentItems = recents.map(getActivity).filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 5);
  const choose = (id: ActivityType) => { onSelect(id); setQuery(""); onClose(); };

  const row = (id: ActivityType, compact = false) => {
    const activity = getActivity(id);
    const active = selected === id;
    const favorite = favorites.includes(id);
    return <TouchableOpacity key={id} onPress={() => choose(id)} style={[styles.activity, compact && styles.activityCompact, active && styles.activityActive]}>
      <View style={[styles.activityIcon, active && styles.activityIconActive]}><Ionicons name={activity.icon} size={18} color={active ? strictlyColors.lime : strictlyColors.ink} /></View>
      <Text numberOfLines={1} style={[styles.activityText, active && styles.activityTextActive]}>{activity.label}</Text>
      <TouchableOpacity hitSlop={10} onPress={() => onToggleFavorite(id)} style={styles.star}><Ionicons name={favorite ? "star" : "star-outline"} size={17} color={favorite ? strictlyColors.lime : strictlyColors.textSoft} /></TouchableOpacity>
    </TouchableOpacity>;
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>ACTIVITY</Text><Text style={styles.title}>What are you training?</Text></View><TouchableOpacity style={styles.close} onPress={onClose}><Ionicons name="close" size={21} color={strictlyColors.text} /></TouchableOpacity></View>
      <View style={styles.search}><Ionicons name="search" size={18} color={strictlyColors.textSoft} /><TextInput autoCorrect={false} autoCapitalize="none" value={query} onChangeText={setQuery} placeholder="Search activities" placeholderTextColor={strictlyColors.textSoft} style={styles.searchInput} />{query ? <TouchableOpacity onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color={strictlyColors.textSoft} /></TouchableOpacity> : null}</View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {query ? <><Text style={styles.sectionLabel}>{results.length ? `${results.length} MATCH${results.length === 1 ? "" : "ES"}` : "NO MATCHES"}</Text><View style={styles.grid}>{results.map((item) => row(item.id))}</View>{!results.length ? <Text style={styles.empty}>Try a sport, training style, or a shorter search.</Text> : null}</> : <>
          {recentItems.length ? <><Text style={styles.sectionLabel}>RECENT</Text><View style={styles.grid}>{recentItems.map((item) => row(item.id, true))}</View></> : null}
          {ACTIVITY_CATEGORIES.map((category) => <View key={category} style={styles.section}><Text style={styles.sectionLabel}>{category.toUpperCase()}</Text><View style={styles.grid}>{ACTIVITY_CATALOG.filter((activity) => activity.category === category).map((item) => row(item.id))}</View></View>)}
        </>}
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: strictlyColors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  eyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.good, fontSize: 8, letterSpacing: 1.4 },
  title: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 25, letterSpacing: -0.7, marginTop: 5 },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, alignItems: "center", justifyContent: "center" },
  search: { height: 52, marginHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.borderStrong },
  searchInput: { flex: 1, color: strictlyColors.text, fontFamily: strictlyType.sans, fontSize: 15 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  section: { marginTop: 22 }, sectionLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.25, marginBottom: 9 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activity: { width: "48.5%", minHeight: 58, flexDirection: "row", alignItems: "center", gap: 8, padding: 9, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  activityCompact: { minHeight: 54 }, activityActive: { backgroundColor: strictlyColors.ink, borderColor: strictlyColors.ink },
  activityIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" }, activityIconActive: { backgroundColor: strictlyColors.inkSoft },
  activityText: { flex: 1, fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 11 }, activityTextActive: { color: strictlyColors.white },
  star: { width: 24, height: 34, alignItems: "center", justifyContent: "center" }, empty: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, marginTop: 8 },
});
