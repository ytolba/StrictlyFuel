import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { saveWorkout } from "../../services/fuelService";
import { loadNutritionProfile, saveNutritionProfile } from "../../services/nutritionProfileService";
import { EMPTY_NUTRITION_PROFILE, type NutritionProfile } from "../../types/nutritionProfile";
import { DEFAULT_ACTIVITIES, getActivity, supportsHeartRateZones } from "../../data/activities";
import { formatDuration } from "../../logic/mealTiming";
import type { ActivityType, HeartRateZone, WorkoutIntensity } from "../../types/fuel";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { FuelTargetCard } from "../../components/fuel/FuelTargetCard";
import { ValueEditorSheet, DURATION_UNITS, WEIGHT_UNITS } from "../../components/fuel/ValueEditorSheet";
import { ActivityPickerSheet } from "../../components/fuel/ActivityPickerSheet";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type EditingField = "duration" | "startsIn" | "weight";

export default function FuelHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { workout, target, createWorkout, recentActivities, favoriteActivities, toggleFavoriteActivity } = useFuel();

  const [activityType, setActivityType] = useState<ActivityType>(workout?.activityType || "running");
  const [duration, setDuration] = useState(workout?.durationMinutes || 60);
  const [startsIn, setStartsIn] = useState(workout?.startsInMinutes || 90);
  const [intensity, setIntensity] = useState<WorkoutIntensity>(workout?.intensity || "moderate");
  const [heartRateZones, setHeartRateZones] = useState<HeartRateZone[]>(workout?.heartRateZones || []);
  const [editingField, setEditingField] = useState<EditingField>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [profile, setProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);

  useEffect(() => {
    loadNutritionProfile().then(setProfile);
  }, []);

  const quickActivities = useMemo(
    () =>
      [...favoriteActivities, ...recentActivities, ...DEFAULT_ACTIVITIES]
        .filter((id, index, all) => all.indexOf(id) === index)
        .slice(0, 4),
    [favoriteActivities, recentActivities]
  );

  const selectedActivity = getActivity(activityType);
  const isImperial = profile.measurementSystem === "imperial";
  const weightLabel = profile.bodyWeightKg
    ? isImperial
      ? `${Math.round(profile.bodyWeightKg * 2.20462)} lb`
      : `${Math.round(profile.bodyWeightKg * 10) / 10} kg`
    : "Add your weight";

  const persistProfile = async (next: NutritionProfile) => {
    setProfile(next);
    await saveNutritionProfile(next);
  };

  // The sheet reports kilograms whatever unit was typed in.
  const saveWeight = (kg: number) => persistProfile({ ...profile, bodyWeightKg: kg });

  const saveUnitPreference = (unitId: string) =>
    persistProfile({ ...profile, measurementSystem: unitId === "kg" ? "metric" : "imperial" });

  const calculate = () => {
    if (duration < 15 || startsIn < 10) {
      return Alert.alert("Check your workout", "Use at least 15 minutes for duration, and 10 minutes before training.");
    }
    if (!profile.bodyWeightKg || profile.bodyWeightKg < 25) {
      return Alert.alert(
        "Add your weight once",
        "Weight is a major part of the carb calculation. Add it here and Strictly will remember it.",
        [{ text: "Not now", style: "cancel" }, { text: "Add weight", onPress: () => setEditingField("weight") }]
      );
    }
    const next = createWorkout({
      activityType,
      durationMinutes: duration,
      startsInMinutes: startsIn,
      bodyWeightKg: profile.bodyWeightKg,
      intensity,
      heartRateZones: supportsHeartRateZones(activityType) ? heartRateZones : [],
    });
    if (user?.uid) saveWorkout(user.uid, next.workout, next.target).catch(() => undefined);
    navigation.navigate("FuelTarget");
  };

  const editorProps = () => {
    if (editingField === "weight") {
      return {
        label: "Body weight",
        value: profile.bodyWeightKg || (isImperial ? 75 : 75),
        units: WEIGHT_UNITS,
        unitId: isImperial ? "lb" : "kg",
        onUnitChange: saveUnitPreference,
        helpText: "Stored once and reused for every future target.",
        onSave: saveWeight,
      };
    }
    const isDuration = editingField === "duration";
    return {
      label: isDuration ? "How long is the session?" : "How long until you start?",
      value: isDuration ? duration : startsIn,
      units: DURATION_UNITS,
      unitId: "min",
      helpText: "Switch to hours for longer sessions.",
      onSave: (minutes: number) => {
        const rounded = Math.max(1, Math.round(minutes));
        if (isDuration) setDuration(rounded);
        else setStartsIn(rounded);
      },
    };
  };

  return (
    <ScreenShell>
      <View style={styles.brandRow}>
        <View>
          <Text style={styles.brand}>STRICTLY</Text>
          <Text style={styles.brandSub}>FUEL THE WORK.</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.avatar} accessibilityLabel="Your profile">
          <Text style={styles.avatarText}>{(user?.firstName || "A").slice(0, 1).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* A returning athlete's live target comes first — they came back for it. */}
      {workout && target ? (
        <TouchableOpacity style={styles.activeWrap} activeOpacity={0.9} onPress={() => navigation.navigate("FuelTarget")}>
          <FuelTargetCard workout={workout} target={target} />
          <View style={styles.activeFooter}>
            <Text style={styles.activeFooterText}>Open today’s plan</Text>
            <Ionicons name="arrow-forward" size={16} color={strictlyColors.onLime} />
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.hero}>What are you training today?</Text>
          <Text style={styles.subhero}>Tell us the session. We’ll turn it into food you can actually use.</Text>
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{workout && target ? "Plan another session" : "Your session"}</Text>

        {/* 1 — activity */}
        <Text style={styles.stepLabel}>ACTIVITY</Text>
        <View style={styles.chips}>
          {quickActivities.map((id) => {
            const activity = getActivity(id);
            const active = activityType === id;
            return (
              <TouchableOpacity key={id} onPress={() => setActivityType(id)} style={[styles.chip, active && styles.chipActive]}>
                <Ionicons name={activity.icon} size={16} color={active ? strictlyColors.onLime : strictlyColors.textSoft} />
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {activity.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => setPickerOpen(true)} style={styles.chipMore}>
            <Ionicons name="ellipsis-horizontal" size={16} color={strictlyColors.text} />
            <Text style={styles.chipMoreText}>More</Text>
          </TouchableOpacity>
        </View>
        {!quickActivities.includes(activityType) ? (
          <Text style={styles.chosen}>Selected: {selectedActivity.label}</Text>
        ) : null}

        {/* 2 — duration and start, in whichever unit suits */}
        <View style={styles.pairRow}>
          <TouchableOpacity style={styles.pair} onPress={() => setEditingField("duration")}>
            <Text style={styles.pairLabel}>HOW LONG</Text>
            <Text style={styles.pairValue}>{formatDuration(duration)}</Text>
            <Ionicons name="create-outline" size={15} color={strictlyColors.textSoft} style={styles.pairIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pair} onPress={() => setEditingField("startsIn")}>
            <Text style={styles.pairLabel}>STARTS IN</Text>
            <Text style={styles.pairValue}>{formatDuration(startsIn)}</Text>
            <Ionicons name="time-outline" size={15} color={strictlyColors.textSoft} style={styles.pairIcon} />
          </TouchableOpacity>
        </View>

        {/* 3 — intensity */}
        <Text style={styles.stepLabel}>INTENSITY</Text>
        <View style={styles.segment}>
          {(["easy", "moderate", "hard"] as WorkoutIntensity[]).map((value) => (
            <TouchableOpacity key={value} onPress={() => setIntensity(value)} style={[styles.segmentItem, intensity === value && styles.segmentActive]}>
              <Text style={[styles.segmentText, intensity === value && styles.segmentTextActive]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {supportsHeartRateZones(activityType) ? (
          <View style={styles.zoneBlock}>
            <View style={styles.zoneHeading}>
              <View style={styles.zoneHeadingCopy}>
                <Text style={styles.stepLabel}>HEART-RATE ZONES · OPTIONAL</Text>
                <Text style={styles.zoneHelp}>Choose every zone this session will include.</Text>
              </View>
              {heartRateZones.length ? (
                <TouchableOpacity onPress={() => setHeartRateZones([])} hitSlop={8}>
                  <Text style={styles.zoneClear}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.zoneRow}>
              {([1, 2, 3, 4, 5] as HeartRateZone[]).map((zone) => {
                const active = heartRateZones.includes(zone);
                return (
                  <TouchableOpacity
                    key={zone}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`Heart-rate zone ${zone}`}
                    onPress={() => setHeartRateZones((current) => active ? current.filter((item) => item !== zone) : [...current, zone].sort())}
                    style={[styles.zone, active && styles.zoneActive]}
                  >
                    <Text style={[styles.zoneNumber, active && styles.zoneNumberActive]}>Z{zone}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.zoneSummary}>
              {heartRateZones.length
                ? `Using zones ${heartRateZones.join(", ")} to refine carbohydrate demand.`
                : "Leave blank if you do not train by heart rate."}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.weightLine} onPress={() => setEditingField("weight")}>
          <Ionicons name="person-outline" size={15} color={strictlyColors.textSoft} />
          <Text style={styles.weightText}>{weightLabel}</Text>
          <Text style={styles.weightEdit}>{profile.bodyWeightKg ? "Edit" : "Add"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primary} onPress={calculate}>
          <Text style={styles.primaryText}>Calculate my fuel</Text>
          <Ionicons name="arrow-forward" size={18} color={strictlyColors.onLime} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.discover} onPress={() => navigation.navigate("Discover")}>
        <View style={styles.discoverIcon}>
          <Ionicons name="compass-outline" size={20} color={strictlyColors.lime} />
        </View>
        <View style={styles.discoverCopy}>
          <Text style={styles.discoverTitle}>What others eat</Text>
          <Text style={styles.discoverText}>Meals that worked for similar sessions.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={strictlyColors.textSoft} />
      </TouchableOpacity>

      <ActivityPickerSheet
        visible={pickerOpen}
        selected={activityType}
        favorites={favoriteActivities}
        recents={recentActivities}
        onClose={() => setPickerOpen(false)}
        onSelect={setActivityType}
        onToggleFavorite={toggleFavoriteActivity}
      />

      {editingField ? (
        <ValueEditorSheet visible onClose={() => setEditingField(undefined)} {...editorProps()} />
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 20 },
  brand: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 20, letterSpacing: -0.5 },
  brandSub: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.4, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  avatarText: { color: strictlyColors.lime, fontFamily: strictlyType.sansMedium, fontWeight: "800" },

  hero: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 32, lineHeight: 36, letterSpacing: -1.2, maxWidth: 340 },
  subhero: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 4, maxWidth: 330 },

  activeWrap: { marginBottom: 4 },
  activeFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, marginTop: 8, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime },
  activeFooterText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 13 },

  card: { padding: 16, marginTop: 18, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large },
  cardTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 17, marginBottom: 16 },
  stepLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.3, marginBottom: 9 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surfaceMuted },
  chipActive: { backgroundColor: strictlyColors.lime },
  chipText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.textSoft, fontSize: 12 },
  chipTextActive: { color: strictlyColors.onLime, fontWeight: "900" },
  chipMore: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: strictlyRadius.pill, borderWidth: 1, borderColor: strictlyColors.borderStrong },
  chipMoreText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 },
  chosen: { fontFamily: strictlyType.sans, color: strictlyColors.lime, fontSize: 11, marginTop: 9 },

  pairRow: { flexDirection: "row", gap: 9, marginTop: 18 },
  pair: { flex: 1, minHeight: 76, justifyContent: "center", paddingHorizontal: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  pairLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, letterSpacing: 1.1 },
  pairValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 18, marginTop: 5 },
  pairIcon: { position: "absolute", top: 12, right: 12 },

  segment: { flexDirection: "row", gap: 6, marginBottom: 4 },
  segmentItem: { flex: 1, height: 44, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  segmentActive: { backgroundColor: strictlyColors.lime },
  segmentText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 12, textTransform: "capitalize" },
  segmentTextActive: { color: strictlyColors.onLime, fontWeight: "900" },

  zoneBlock: { marginTop: 17 },
  zoneHeading: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  zoneHeadingCopy: { flex: 1 },
  zoneHelp: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, marginTop: -4, marginBottom: 9 },
  zoneClear: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.lime, fontSize: 10 },
  zoneRow: { flexDirection: "row", gap: 7 },
  zone: { flex: 1, height: 43, borderRadius: strictlyRadius.medium, borderWidth: 1, borderColor: strictlyColors.border, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  zoneActive: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime },
  zoneNumber: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 10, fontWeight: "700" },
  zoneNumberActive: { color: strictlyColors.onLime, fontWeight: "900" },
  zoneSummary: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 7 },

  weightLine: { height: 48, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  weightText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12 },
  weightEdit: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.lime, fontSize: 11 },

  primary: { height: 56, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 4 },
  primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 14 },

  discover: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, paddingHorizontal: 15, marginTop: 12, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  discoverIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  discoverCopy: { flex: 1 },
  discoverTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 14 },
  discoverText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginTop: 3 },
});
