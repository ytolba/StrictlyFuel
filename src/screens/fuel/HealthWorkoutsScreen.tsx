import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { appleHealthSupported, connectAppleHealth, getAppleHealthConnection, loadRecentHealthWorkouts, refreshHealthWhenAppBecomesActive, type AppleHealthState, type HealthWorkout } from "../../services/appleHealthService";
import { formatDuration } from "../../logic/mealTiming";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const workoutDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default function HealthWorkoutsScreen({ navigation }: any) {
  const [workouts, setWorkouts] = useState<HealthWorkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<AppleHealthState>("permission_required");
  const [connectionDetail, setConnectionDetail] = useState("");
  const supported = appleHealthSupported();

  const refresh = async (askPermission = false) => {
    setLoading(true);
    try {
      if (askPermission) await connectAppleHealth();
      const status = await getAppleHealthConnection();
      setConnection(status.state);
      setConnectionDetail(status.detail);
      setWorkouts(status.state === "connected" || status.state === "limited" ? await loadRecentHealthWorkouts(30) : []);
    } catch (error) {
      Alert.alert("Apple Health couldn’t connect", error instanceof Error ? error.message : "Check Health access and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supported) return;
    void refresh(false);
    const subscription = refreshHealthWhenAppBecomesActive(() => refresh(false));
    return () => subscription.remove();
  }, [supported]);

  const copyWorkoutToPreWorkout = (item: HealthWorkout) => navigation.navigate("Main", { screen: "Home", params: { copiedWorkout: item } });

  return <ScreenShell title="Apple Health" eyebrow="CONNECTED WORKOUTS" back onBack={() => navigation.goBack()}>
    <View style={styles.hero}><View style={styles.healthIcon}><Ionicons name="heart" size={27} color={strictlyColors.white} /></View><Text style={styles.heroTitle}>Reuse a workout you already know.</Text><Text style={styles.heroText}>Copy a previous activity and duration into Pre-Workout, then adjust the timing and intensity for your next session.</Text></View>
    {!supported ? <View style={styles.notice}><Text style={styles.noticeTitle}>{Platform.OS === "ios" ? "Rebuild the iOS app once" : "Apple Health is iPhone only"}</Text><Text style={styles.noticeText}>{Platform.OS === "ios" ? "The HealthKit connection is now in the native project and appears after a fresh Xcode device build." : "Open StrictlyFuel on an iPhone to connect Apple Health."}</Text></View> : null}
    {supported && !loading ? <View style={styles.status}><View style={[styles.statusDot, (connection === "connected" || connection === "limited") && styles.statusDotConnected]} /><View style={styles.statusCopy}><Text style={styles.statusTitle}>{connection === "connected" ? "Apple Health connected" : connection === "limited" ? "Connected with limited visibility" : connection === "error" ? "Apple Health needs attention" : "Permission required"}</Text><Text style={styles.statusText}>{connectionDetail}</Text></View></View> : null}
    {supported && connection !== "connected" && !loading ? <TouchableOpacity style={styles.connect} onPress={() => refresh(true)}><Ionicons name="heart-outline" size={19} color={strictlyColors.onLime} /><Text style={styles.connectText}>{connection === "limited" ? "Review access" : "Continue"}</Text></TouchableOpacity> : null}
    {loading ? <View style={styles.loading}><LoadingState title="Loading workouts" messages={["Reading only what you allowed", "Organizing recent sessions"]} /></View> : null}
    {(connection === "connected" || connection === "limited") && !loading ? <>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Recent workouts</Text><TouchableOpacity onPress={() => refresh(false)}><Ionicons name="refresh" size={19} color={strictlyColors.text} /></TouchableOpacity></View>
      {!workouts.length ? <View style={styles.notice}><Text style={styles.noticeTitle}>No shared workouts yet</Text><Text style={styles.noticeText}>Apple protects denied and empty workout history the same way. You can review access in the Health app under Sharing.</Text></View> : workouts.map((item) => <View key={item.id} style={styles.workout}><View style={styles.workoutTop}><View style={styles.workoutIcon}><Ionicons name="fitness-outline" size={18} color={strictlyColors.text} /></View><View style={styles.workoutCopy}><Text style={styles.workoutTitle}>{item.activityLabel}</Text><Text style={styles.workoutMeta}>{workoutDate(item.startDate)} · {item.sourceName || "Apple Health"}</Text></View></View><View style={styles.stats}><Text style={styles.stat}>{formatDuration(item.durationMinutes)}</Text>{item.distanceKm ? <Text style={styles.stat}>{item.distanceKm.toFixed(1)} km</Text> : null}{item.activeCalories ? <Text style={styles.stat}>{Math.round(item.activeCalories)} kcal</Text> : null}{item.averageHeartRate ? <Text style={styles.stat}>avg {Math.round(item.averageHeartRate)} bpm</Text> : null}{item.maxHeartRate ? <Text style={styles.stat}>max {Math.round(item.maxHeartRate)} bpm</Text> : null}</View><TouchableOpacity style={styles.use} onPress={() => copyWorkoutToPreWorkout(item)}><Text style={styles.useText}>Copy to Pre-Workout</Text><Ionicons name="copy-outline" size={16} color={strictlyColors.text} /></TouchableOpacity></View>)}
    </> : null}
    <Text style={styles.privacy}>StrictlyFuel requests read-only workout access. Health data stays on your device unless you explicitly create and save a new fuel plan.</Text>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", padding: 24, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 1, borderColor: strictlyColors.border },
  healthIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#E64A55" },
  heroTitle: { marginTop: 14, fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 21, letterSpacing: -0.4 },
  heroText: { marginTop: 7, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, textAlign: "center" },
  connect: { height: 56, marginTop: 12, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.lime },
  status: { marginTop: 12, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  statusDot: { width: 10, height: 10, marginTop: 4, borderRadius: 5, backgroundColor: strictlyColors.clay }, statusDotConnected: { backgroundColor: strictlyColors.good }, statusCopy: { flex: 1 }, statusTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 }, statusText: { marginTop: 3, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 15 },
  connectText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.onLime, fontSize: 13 },
  loading: { marginTop: 12, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large },
  notice: { marginTop: 12, padding: 17, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream },
  noticeTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 14 },
  noticeText: { marginTop: 5, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17 },
  sectionRow: { marginTop: 25, marginBottom: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 19 },
  workout: { padding: 15, marginBottom: 9, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  workoutTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  workoutIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.cream },
  workoutCopy: { flex: 1 }, workoutTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 15 },
  workoutMeta: { marginTop: 3, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }, stat: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: strictlyRadius.pill, overflow: "hidden", backgroundColor: strictlyColors.cream, fontFamily: strictlyType.mono, color: strictlyColors.text, fontSize: 11 },
  use: { height: 43, marginTop: 12, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted },
  useText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 11 },
  privacy: { marginTop: 18, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14, textAlign: "center" },
});
