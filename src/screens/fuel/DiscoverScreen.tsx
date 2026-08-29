import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COMMUNITY_SEED } from "../../data/communitySeed";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { fetchFuelPosts, removeSavedCommunityMeal, saveCommunityMeal } from "../../services/fuelService";
import type { ActivityType, CommunityFilters, FuelPost } from "../../types/fuel";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { FuelPostCard } from "../../components/fuel/FuelPostCard";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const ACTIVITIES: (ActivityType | "all")[] = ["all", "running", "cycling", "strength", "hyrox", "swimming"];

function matches(post: FuelPost, filters: CommunityFilters) {
  if (filters.activityType && post.workout.activityType !== filters.activityType) return false;
  const duration = post.workout.durationMinutes;
  if (filters.durationBand === "under45" && duration >= 45) return false;
  if (filters.durationBand === "45to90" && (duration < 45 || duration > 90)) return false;
  if (filters.durationBand === "90to120" && (duration < 90 || duration > 120)) return false;
  if (filters.durationBand === "over120" && duration <= 120) return false;
  const timing = post.workout.startsInMinutes;
  if (filters.timingBand === "under30" && timing >= 30) return false;
  if (filters.timingBand === "30to60" && (timing < 30 || timing > 60)) return false;
  if (filters.timingBand === "60to120" && (timing < 60 || timing > 120)) return false;
  if (filters.timingBand === "120to180" && (timing < 120 || timing > 180)) return false;
  if (filters.timingBand === "over180" && timing <= 180) return false;
  if (filters.highScoreOnly && post.meal.score.total < 90) return false;
  return true;
}

export default function DiscoverScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { workout, target, localPosts, savedPostIds, toggleSavedPost, importPostMeal } = useFuel();
  const [activity, setActivity] = useState<ActivityType | "all">(route.params?.filters?.activityType || "all");
  const [remotePosts, setRemotePosts] = useState<FuelPost[]>([]);
  const filters: CommunityFilters = { ...(route.params?.filters || {}), activityType: activity === "all" ? undefined : activity };

  useEffect(() => { fetchFuelPosts().then(setRemotePosts).catch(() => undefined); }, []);
  const posts = useMemo(() => {
    const merged = [...localPosts, ...remotePosts, ...COMMUNITY_SEED];
    const unique = merged.filter((post, index) => merged.findIndex((candidate) => candidate.id === post.id) === index).filter((post) => matches(post, filters));
    return unique.sort((a, b) => {
      const relevanceA = workout && a.workout.activityType === workout.activityType ? 100 : 0;
      const relevanceB = workout && b.workout.activityType === workout.activityType ? 100 : 0;
      const targetA = target ? Math.abs(a.meal.macros.carbs - target.carbTarget) : 0;
      const targetB = target ? Math.abs(b.meal.macros.carbs - target.carbTarget) : 0;
      return (relevanceB - targetB + b.copies * 0.05 + b.saves * 0.03) - (relevanceA - targetA + a.copies * 0.05 + a.saves * 0.03);
    });
  }, [localPosts, remotePosts, activity, route.params?.filters, target, workout]);

  const save = (post: FuelPost) => {
    const wasSaved = savedPostIds.includes(post.id);
    toggleSavedPost(post.id);
    if (user?.uid) (wasSaved ? removeSavedCommunityMeal(user.uid, post.id) : saveCommunityMeal(user.uid, post)).catch(() => undefined);
  };
  const copy = (post: FuelPost) => {
    if (!target) return Alert.alert("Set today’s fuel target first", "Strictly needs your workout to scale this meal to you.", [{ text: "Go to Home", onPress: () => navigation.navigate("Home") }]);
    importPostMeal(post);
    navigation.getParent()?.navigate("BuildMeal");
  };

  return <ScreenShell>
    <View style={styles.header}><View><Text style={styles.eyebrow}>DISCOVER</Text><Text style={styles.title}>Fuel worth copying.</Text></View><TouchableOpacity style={styles.filter} onPress={() => navigation.getParent()?.navigate("CommunityFilters", { filters })}><Ionicons name="options-outline" size={19} color={strictlyColors.text} /></TouchableOpacity></View>
    <Text style={styles.subtitle}>{workout ? `Prioritized for your ${workout.durationMinutes}-minute ${workout.activityType} session.` : "See what athletes eat before specific workouts."}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{ACTIVITIES.map((item) => <TouchableOpacity key={item} onPress={() => setActivity(item)} style={[styles.chip, activity === item && styles.chipActive]}><Text style={[styles.chipText, activity === item && styles.chipTextActive]}>{item === "all" ? "For you" : item}</Text></TouchableOpacity>)}</ScrollView>
    <View style={styles.utility}><Ionicons name="sparkles-outline" size={17} color={strictlyColors.text} /><Text style={styles.utilityText}><Text style={styles.utilityStrong}>Ranked for usefulness.</Text> Similar workout, timing, carb target, saves, and copies matter more than likes.</Text></View>
    <Text style={styles.resultCount}>{posts.length} MATCHING MEALS</Text>
    {posts.map((post) => <FuelPostCard key={post.id} post={post} saved={savedPostIds.includes(post.id)} onPress={() => navigation.getParent()?.navigate("FuelPostDetail", { post })} onSave={() => save(post)} onCopy={() => copy(post)} />)}
    {!posts.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No exact matches yet</Text><Text style={styles.emptyText}>Clear a filter or be the first to share fuel for this workout.</Text></View> : null}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  eyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9, letterSpacing: 1.5 },
  title: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 32, letterSpacing: -1.1, marginTop: 5 },
  filter: { width: 42, height: 42, borderRadius: 21, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, alignItems: "center", justifyContent: "center" },
  subtitle: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 8 },
  chips: { gap: 7, paddingVertical: 17, paddingRight: 20 },
  chip: { height: 38, justifyContent: "center", paddingHorizontal: 14, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  chipActive: { backgroundColor: strictlyColors.ink, borderColor: strictlyColors.ink },
  chipText: { fontFamily: strictlyType.sansMedium, fontWeight: "600", color: strictlyColors.text, fontSize: 11, textTransform: "capitalize" },
  chipTextActive: { color: strictlyColors.white },
  utility: { flexDirection: "row", gap: 9, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, padding: 13, marginBottom: 18 },
  utilityText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15 },
  utilityStrong: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text },
  resultCount: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.2, marginBottom: 10 },
  empty: { alignItems: "center", padding: 30 },
  emptyTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 17 },
  emptyText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginTop: 5, textAlign: "center" },
});

