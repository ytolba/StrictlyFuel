import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { loadNutritionProfile } from "../../services/nutritionProfileService";
import { saveWorkout } from "../../services/fuelService";
import { appleHealthSupported, connectAppleHealth, loadRecentHealthWorkouts, type HealthWorkout } from "../../services/appleHealthService";
import { formatDuration } from "../../logic/mealTiming";
import type { WorkoutIntensity } from "../../types/fuel";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const workoutDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default function HealthWorkoutsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { createWorkout } = useFuel();
  const [workouts, setWorkouts] = useState<HealthWorkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const supported = appleHealthSupported();

  const refresh = async (askPermission = false) => {
    setLoading(true);
    try {
      if (askPermission) await connectAppleHealth();
      const items = await loadRecentHealthWorkouts(30);
      setWorkouts(items);
      setConnected(true);
    } catch (error) {
      Alert.alert("Apple Health couldn’t connect", error instanceof Error ? error.message : "Check Health access and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (supported) refresh(false); }, [supported]);

  const useWorkoutForNextPlan = async (item: HealthWorkout) => {
    const profile = await loadNutritionProfile();
    if (!profile.bodyWeightKg) return Alert.alert("Add your weight first", "Strictly needs your weight to turn this workout into a carb target.", [{ text: "Open fuel profile", onPress: () => navigation.navigate("Settings") }]);
    const next = createWorkout({ activityType: item.activityType, durationMinutes: item.durationMinutes, startsInMinutes: 90, bodyWeightKg: profile.bodyWeightKg, intensity: "moderate", heartRateZones: [] });
    if (user?.uid) saveWorkout(user.uid, next.workout, next.target).catch(() => undefined);
    navigation.navigate("Main", { screen: "Home" });
  };

  const beginRecovery = (item: HealthWorkout) => {
    Alert.alert("How hard did that session feel?", "Strictly will use the completed workout’s duration and Health data as context. Your effort choice keeps the recovery recommendation personal.", [
      { text: "Easy", onPress: () => openRecovery(item, "easy") },
      { text: "Moderate", onPress: () => openRecovery(item, "moderate") },
      { text: "Hard", onPress: () => openRecovery(item, "hard") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openRecovery = async (item: HealthWorkout, intensity: WorkoutIntensity) => {
    const profile = await loadNutritionProfile();
    if (!profile.bodyWeightKg) return Alert.alert("Add your weight first", "Strictly needs your weight to personalize the recovery meal.", [{ text: "Open fuel profile", onPress: () => navigation.navigate("Settings") }]);
    createWorkout({
      activityType: item.activityType,
      durationMinutes: item.durationMinutes,
      // This value is only required by the shared workout shape. Recovery does
      // not use a countdown; it uses the completed workout below.
      startsInMinutes: 90,
      bodyWeightKg: profile.bodyWeightKg,
      intensity,
      heartRateZones: [],
      completedWorkout: {
        source: "apple_health",
        id: item.id,
        completedAt: item.endDate,
        sourceName: item.sourceName,
        distanceKm: item.distanceKm,
        activeCalories: item.activeCalories,
        averageHeartRate: item.averageHeartRate,
        maxHeartRate: item.maxHeartRate,
      },
    });
    navigation.navigate("PostWorkoutMeals");
  };

  return <ScreenShell title="Apple Health" eyebrow="CONNECTED WORKOUTS" back onBack={() => navigation.goBack()}>
    <View style={styles.hero}><View style={styles.healthIcon}><Ionicons name="heart" size={27} color={strictlyColors.white} /></View><Text style={styles.heroTitle}>Let your completed training lead.</Text><Text style={styles.heroText}>Use a recent workout to plan a similar future session, or get a recovery meal based on what you actually completed.</Text></View>
    {!supported ? <View style={styles.notice}><Text style={styles.noticeTitle}>{Platform.OS === "ios" ? "Rebuild the iOS app once" : "Apple Health is iPhone only"}</Text><Text style={styles.noticeText}>{Platform.OS === "ios" ? "The HealthKit connection is now in the native project and appears after a fresh Xcode device build." : "Open StrictlyFuel on an iPhone to connect Apple Health."}</Text></View> : null}
    {supported && !connected && !loading ? <TouchableOpacity style={styles.connect} onPress={() => refresh(true)}><Ionicons name="heart-outline" size={19} color={strictlyColors.onLime} /><Text style={styles.connectText}>Connect Apple Health</Text></TouchableOpacity> : null}
    {loading ? <View style={styles.loading}><LoadingState title="Loading workouts" messages={["Reading only what you allowed", "Organizing recent sessions"]} /></View> : null}
    {connected && !loading ? <>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Recent workouts</Text><TouchableOpacity onPress={() => refresh(false)}><Ionicons name="refresh" size={19} color={strictlyColors.text} /></TouchableOpacity></View>
      {!workouts.length ? <View style={styles.notice}><Text style={styles.noticeTitle}>No shared workouts yet</Text><Text style={styles.noticeText}>Apple protects denied and empty workout history the same way. You can review access in the Health app under Sharing.</Text></View> : workouts.map((item) => <View key={item.id} style={styles.workout}><View style={styles.workoutTop}><View style={styles.workoutIcon}><Ionicons name="fitness-outline" size={18} color={strictlyColors.text} /></View><View style={styles.workoutCopy}><Text style={styles.workoutTitle}>{item.activityLabel}</Text><Text style={styles.workoutMeta}>{workoutDate(item.startDate)} · {item.sourceName || "Apple Health"}</Text></View></View><View style={styles.stats}><Text style={styles.stat}>{formatDuration(item.durationMinutes)}</Text>{item.distanceKm ? <Text style={styles.stat}>{item.distanceKm.toFixed(1)} km</Text> : null}{item.activeCalories ? <Text style={styles.stat}>{Math.round(item.activeCalories)} kcal</Text> : null}{item.averageHeartRate ? <Text style={styles.stat}>avg {Math.round(item.averageHeartRate)} bpm</Text> : null}{item.maxHeartRate ? <Text style={styles.stat}>max {Math.round(item.maxHeartRate)} bpm</Text> : null}</View><TouchableOpacity style={styles.recover} onPress={() => beginRecovery(item)}><Text style={styles.recoverText}>What should I eat now?</Text><Ionicons name="restaurant-outline" size={16} color={strictlyColors.onLime} /></TouchableOpacity><TouchableOpacity style={styles.use} onPress={() => useWorkoutForNextPlan(item)}><Text style={styles.useText}>Plan a similar next workout</Text><Ionicons name="arrow-forward" size={16} color={strictlyColors.text} /></TouchableOpacity></View>)}
    </> : null}
    <Text style={styles.privacy}>StrictlyFuel requests read-only workout access. Health data stays on your device unless you explicitly create and save a new fuel plan.</Text>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", padding: 24, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 1, borderColor: strictlyColors.border },
  healthIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#E64A55" },
  heroTitle: { marginTop: 14, fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 21, letterSpacing: -0.4 },
  heroText: { marginTop: 7, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, textAlign: "center" },
  connect: { height: 56, marginTop: 12, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.lime },
  connectText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 13 },
  loading: { marginTop: 12, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large },
  notice: { marginTop: 12, padding: 17, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream },
  noticeTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 14 },
  noticeText: { marginTop: 5, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17 },
  sectionRow: { marginTop: 25, marginBottom: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 19 },
  workout: { padding: 15, marginBottom: 9, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  workoutTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  workoutIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.cream },
  workoutCopy: { flex: 1 }, workoutTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 15 },
  workoutMeta: { marginTop: 3, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10 },
  stats: { flexDirection: "row", gap: 7, marginTop: 12 }, stat: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: strictlyRadius.pill, overflow: "hidden", backgroundColor: strictlyColors.cream, fontFamily: strictlyType.mono, color: strictlyColors.text, fontSize: 9 },
  recover: { height: 43, marginTop: 12, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.lime },
  recoverText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.onLime, fontSize: 11 },
  use: { height: 39, marginTop: 8, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted },
  useText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 11 },
  privacy: { marginTop: 18, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, textAlign: "center" },
});
