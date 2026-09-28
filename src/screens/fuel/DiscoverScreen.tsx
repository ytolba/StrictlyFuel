import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COMMUNITY_SEED } from "../../data/communitySeed";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { deleteFuelPost, fetchFuelPosts, removeSavedCommunityMeal, saveCommunityMeal } from "../../services/fuelService";
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
  const { workout, target, localPosts, savedPostIds, toggleSavedPost, importPostMeal, removeLocalPost } = useFuel();
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
  const isMine = (post: FuelPost) => Boolean(user?.uid && !post.isDemo && post.userId === user.uid);
  const remove = (post: FuelPost) => confirmDeletePost(post, () => {
    removeLocalPost(post.id);
    setRemotePosts((current) => current.filter((item) => item.id !== post.id));
  });
  const copy = (post: FuelPost) => {
    if (!target) return Alert.alert("Set today’s fuel target first", "Strictly needs your workout to scale this meal to you.", [{ text: "Go to Home", onPress: () => navigation.navigate("Home") }]);
    importPostMeal(post);
    navigation.getParent()?.navigate("BuildMeal");
  };

  return <ScreenShell>
    <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.title}>Ideas</Text><Text style={styles.tagline}>Fuel worth copying.</Text></View><TouchableOpacity style={styles.filter} onPress={() => navigation.getParent()?.navigate("CommunityFilters", { filters })}><Ionicons name="options-outline" size={19} color={strictlyColors.text} /></TouchableOpacity></View>
    <Text style={styles.subtitle}>{workout ? `Prioritized for your ${workout.durationMinutes}-minute ${workout.activityType} session.` : "See what athletes eat before specific workouts."}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{ACTIVITIES.map((item) => <TouchableOpacity key={item} onPress={() => setActivity(item)} style={[styles.chip, activity === item && styles.chipActive]}><Text style={[styles.chipText, activity === item && styles.chipTextActive]}>{item === "all" ? "For you" : item}</Text></TouchableOpacity>)}</ScrollView>
    <View style={styles.utility}><Ionicons name="sparkles-outline" size={17} color={strictlyColors.text} /><Text style={styles.utilityText}><Text style={styles.utilityStrong}>Ranked for usefulness.</Text> Similar workout, timing, carb target, saves, and copies matter more than likes.</Text></View>
    <Text style={styles.resultCount}>{posts.length} MATCHING MEALS</Text>
    {posts.map((post) => <FuelPostCard key={post.id} post={post} saved={savedPostIds.includes(post.id)} onPress={() => navigation.getParent()?.navigate("FuelPostDetail", { post })} onSave={() => save(post)} onCopy={() => copy(post)} onDelete={isMine(post) ? () => remove(post) : undefined} />)}
    {!posts.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No exact matches yet</Text><Text style={styles.emptyText}>Clear a filter or be the first to share fuel for this workout.</Text></View> : null}
  </ScreenShell>;
}

// Shared by the Ideas list and the post page so deleting reads the same everywhere.
export function confirmDeletePost(post: FuelPost, onDeleted: () => void) {
  Alert.alert("Delete this post?", "It will be removed from Ideas for everyone, along with its photo. Your meal stays in My Fuel.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      try { await deleteFuelPost(post.id); onDeleted(); }
      catch (reason) { Alert.alert("Couldn’t delete post", reason instanceof Error ? reason.message : "Please check your connection and try again."); }
    } },
  ]);
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  headerCopy: { flex: 1 },
  title: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 34, letterSpacing: -1.1 },
  tagline: { fontFamily: strictlyType.semibold, color: strictlyColors.text, fontSize: 17, letterSpacing: -0.3, marginTop: 2 },
  filter: { width: 42, height: 42, borderRadius: 21, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, alignItems: "center", justifyContent: "center" },
  subtitle: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 6 },
  chips: { gap: 7, paddingVertical: 17, paddingRight: 20 },
  chip: { height: 38, justifyContent: "center", paddingHorizontal: 14, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  chipActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime },
  chipText: { fontFamily: strictlyType.semibold,  color: strictlyColors.text, fontSize: 13, textTransform: "capitalize" },
  chipTextActive: { color: strictlyColors.onLime },
  utility: { flexDirection: "row", gap: 9, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, padding: 13, marginBottom: 18 },
  utilityText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 17 },
  utilityStrong: { fontFamily: strictlyType.bold,  color: strictlyColors.text },
  resultCount: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1, marginBottom: 10 },
  empty: { alignItems: "center", padding: 30 },
  emptyTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 17 },
  emptyText: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, marginTop: 5, textAlign: "center" },
});

