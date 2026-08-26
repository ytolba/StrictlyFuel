import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { saveWorkout } from "../../services/fuelService";
import { COMMUNITY_SEED } from "../../data/communitySeed";
import type { ActivityType, WorkoutIntensity } from "../../types/fuel";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { FuelTargetCard } from "../../components/fuel/FuelTargetCard";
import { FuelPostCard } from "../../components/fuel/FuelPostCard";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const ACTIVITIES: { id: ActivityType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "running", label: "Run", icon: "walk-outline" },
  { id: "cycling", label: "Ride", icon: "bicycle-outline" },
  { id: "strength", label: "Lift", icon: "barbell-outline" },
  { id: "swimming", label: "Swim", icon: "water-outline" },
  { id: "hyrox", label: "Hyrox", icon: "fitness-outline" },
  { id: "crossfit", label: "CrossFit", icon: "flash-outline" },
  { id: "soccer", label: "Soccer", icon: "football-outline" },
  { id: "basketball", label: "Basketball", icon: "basketball-outline" },
  { id: "triathlon", label: "Triathlon", icon: "trophy-outline" },
  { id: "hiking", label: "Hike", icon: "trail-sign-outline" },
  { id: "other", label: "Other", icon: "add-outline" },
];

export default function FuelHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { workout, target, createWorkout, importPostMeal, savedPostIds, toggleSavedPost } = useFuel();
  const [activityType, setActivityType] = useState<ActivityType>("running");
  const [duration, setDuration] = useState("60");
  const [startsIn, setStartsIn] = useState("90");
  const [weight, setWeight] = useState("165");
  const [intensity, setIntensity] = useState<WorkoutIntensity>("moderate");
  const similar = useMemo(() => COMMUNITY_SEED.filter((post) => post.workout.activityType === (workout?.activityType || activityType)).slice(0, 2), [activityType, workout]);

  const calculate = () => {
    const durationMinutes = Number(duration);
    const startsInMinutes = Number(startsIn);
    const weightLb = Number(weight);
    if (!durationMinutes || durationMinutes < 15 || !startsInMinutes || startsInMinutes < 10 || !weightLb || weightLb < 70) {
      return Alert.alert("Check your workout", "Use at least 15 minutes for duration, 10 minutes before training, and a valid body weight.");
    }
    const next = createWorkout({ activityType, durationMinutes, startsInMinutes, bodyWeightKg: weightLb / 2.20462, intensity });
    if (user?.uid) saveWorkout(user.uid, next.workout, next.target).catch(() => undefined);
    navigation.navigate("FuelTarget");
  };

  return <ScreenShell>
    <View style={styles.brandRow}><View><Text style={styles.brand}>STRICTLY</Text><Text style={styles.brandSub}>PRE-WORKOUT FUEL</Text></View><TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.avatar}><Text style={styles.avatarText}>{(user?.firstName || "A").slice(0, 1).toUpperCase()}</Text></TouchableOpacity></View>
    <Text style={styles.hero}>What are you training today?</Text>
    <Text style={styles.subhero}>Get a carb target built for this workout, not your whole day.</Text>

    <Text style={styles.label}>ACTIVITY</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activityRow}>
      {ACTIVITIES.map((activity) => <TouchableOpacity key={activity.id} onPress={() => setActivityType(activity.id)} style={[styles.activity, activityType === activity.id && styles.activityActive]}><Ionicons name={activity.icon} size={18} color={activityType === activity.id ? strictlyColors.white : strictlyColors.ink} /><Text style={[styles.activityText, activityType === activity.id && styles.activityTextActive]}>{activity.label}</Text></TouchableOpacity>)}
    </ScrollView>

    <View style={styles.formCard}>
      <View style={styles.fieldRow}>
        <View style={styles.field}><Text style={styles.fieldLabel}>Duration</Text><View style={styles.inputWrap}><TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" style={styles.input} /><Text style={styles.suffix}>min</Text></View></View>
        <View style={styles.field}><Text style={styles.fieldLabel}>Starts in</Text><View style={styles.inputWrap}><TextInput value={startsIn} onChangeText={setStartsIn} keyboardType="number-pad" style={styles.input} /><Text style={styles.suffix}>min</Text></View></View>
        <View style={styles.field}><Text style={styles.fieldLabel}>Weight</Text><View style={styles.inputWrap}><TextInput value={weight} onChangeText={setWeight} keyboardType="number-pad" style={styles.input} /><Text style={styles.suffix}>lb</Text></View></View>
      </View>
      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Intensity</Text>
      <View style={styles.segment}>{(["easy", "moderate", "hard"] as WorkoutIntensity[]).map((value) => <TouchableOpacity key={value} onPress={() => setIntensity(value)} style={[styles.segmentItem, intensity === value && styles.segmentActive]}><Text style={[styles.segmentText, intensity === value && styles.segmentTextActive]}>{value}</Text></TouchableOpacity>)}</View>
      <TouchableOpacity style={styles.primary} onPress={calculate}><Text style={styles.primaryText}>Calculate my fuel</Text><Ionicons name="arrow-forward" size={18} color={strictlyColors.ink} /></TouchableOpacity>
    </View>

    {workout && target ? <View style={styles.previous}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your active workout</Text><TouchableOpacity onPress={() => navigation.navigate("FuelTarget")}><Text style={styles.link}>Open target</Text></TouchableOpacity></View><FuelTargetCard workout={workout} target={target} /></View> : null}

    <View style={styles.sectionHead}><View><Text style={styles.sectionTitle}>Athletes fueling similar work</Text><Text style={styles.sectionSubtitle}>Useful meals, ranked by context</Text></View><TouchableOpacity onPress={() => navigation.navigate("Discover")}><Text style={styles.link}>See all</Text></TouchableOpacity></View>
    {similar.map((post) => <FuelPostCard key={post.id} post={post} saved={savedPostIds.includes(post.id)} onPress={() => navigation.navigate("FuelPostDetail", { postId: post.id })} onSave={() => toggleSavedPost(post.id)} onCopy={() => { if (!target) return Alert.alert("Set a fuel target first", "Calculate today’s workout so Strictly can scale this meal for you."); importPostMeal(post); navigation.navigate("BuildMeal"); }} />)}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  brand: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 20, letterSpacing: -0.5 },
  brandSub: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.4, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: strictlyColors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { color: strictlyColors.lime, fontFamily: strictlyType.sansMedium, fontWeight: "800" },
  hero: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 38, lineHeight: 41, letterSpacing: -1.5, marginTop: 30, maxWidth: 340 },
  subhero: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 330 },
  label: { fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.4, color: strictlyColors.textSoft, marginTop: 28, marginBottom: 10 },
  activityRow: { gap: 8, paddingRight: 20 },
  activity: { flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 14, height: 42, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  activityActive: { backgroundColor: strictlyColors.ink, borderColor: strictlyColors.ink },
  activityText: { fontFamily: strictlyType.sansMedium, fontWeight: "600", color: strictlyColors.ink, fontSize: 12 },
  activityTextActive: { color: strictlyColors.white },
  formCard: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, padding: 16, marginTop: 14 },
  fieldRow: { flexDirection: "row", gap: 10 },
  field: { flex: 1 },
  fieldLabel: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 10, marginBottom: 7 },
  inputWrap: { height: 52, flexDirection: "row", alignItems: "center", backgroundColor: strictlyColors.surfaceMuted, borderRadius: strictlyRadius.medium, paddingHorizontal: 12 },
  input: { flex: 1, fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 17, padding: 0 },
  suffix: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9 },
  segment: { flexDirection: "row", backgroundColor: strictlyColors.surfaceMuted, borderRadius: strictlyRadius.medium, padding: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
  segmentActive: { backgroundColor: strictlyColors.white },
  segmentText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 11, textTransform: "capitalize" },
  segmentTextActive: { color: strictlyColors.ink, fontWeight: "700" },
  primary: { height: 54, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 16 },
  primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 14 },
  previous: { marginTop: 28 },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 30, marginBottom: 12 },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 19, letterSpacing: -0.35 },
  sectionSubtitle: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginTop: 4 },
  link: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 11 },
});

