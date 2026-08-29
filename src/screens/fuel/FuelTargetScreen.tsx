import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { FuelTargetCard } from "../../components/fuel/FuelTargetCard";
import { CarbSpeedBar } from "../../components/fuel/CarbSpeedBar";
import { formatDuration } from "../../logic/mealTiming";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function FuelTargetScreen({ navigation }: any) {
  const { workout, target } = useFuel();
  const [showSplit, setShowSplit] = useState(false);

  if (!workout || !target) {
    return (
      <ScreenShell title="Fuel target" back onBack={() => navigation.goBack()}>
        <Text style={styles.empty}>Calculate a workout first.</Text>
      </ScreenShell>
    );
  }

  const hourly = Math.round((target.intraWorkout.lowPerHour + target.intraWorkout.highPerHour) / 2 / 5) * 5;
  const totalDuring = Math.round((hourly * workout.durationMinutes) / 60 / 5) * 5;
  const packTarget = Math.ceil((totalDuring * 1.1) / 5) * 5;
  const intervalGrams = Math.round(hourly / 2 / 5) * 5;
  const timeline = target.intraWorkout.required
    ? Array.from({ length: Math.floor(workout.durationMinutes / 30) }, (_, index) => ({ minute: (index + 1) * 30, grams: intervalGrams }))
    : [];

  const action = (opts: { icon: string; title: string; text: string; onPress: () => void; primary?: boolean }) => (
    <TouchableOpacity style={opts.primary ? styles.actionPrimary : styles.action} onPress={opts.onPress} activeOpacity={0.85}>
      <View style={opts.primary ? styles.actionIconPrimary : styles.actionIcon}>
        <Ionicons name={opts.icon as any} size={21} color={opts.primary ? strictlyColors.onLime : strictlyColors.text} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={opts.primary ? styles.actionTitlePrimary : styles.actionTitle}>{opts.title}</Text>
        <Text style={opts.primary ? styles.actionTextPrimary : styles.actionText}>{opts.text}</Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={opts.primary ? strictlyColors.onLime : strictlyColors.textSoft} />
    </TouchableOpacity>
  );

  return (
    <ScreenShell title="Today’s fuel" eyebrow="WORKOUT READY" back onBack={() => navigation.goBack()}>
      <FuelTargetCard workout={workout} target={target} />

      {/* Digestion speed is the part athletes get wrong most often, so it gets
          its own explainer rather than only a bar on the card above. */}
      <TouchableOpacity style={styles.splitToggle} onPress={() => setShowSplit((current) => !current)} activeOpacity={0.8}>
        <Ionicons name="speedometer-outline" size={18} color={strictlyColors.lime} />
        <Text style={styles.splitToggleText}>What do fast, medium and slow mean?</Text>
        <Ionicons name={showSplit ? "chevron-up" : "chevron-down"} size={17} color={strictlyColors.textSoft} />
      </TouchableOpacity>

      {showSplit ? (
        <View style={styles.splitPanel}>
          <CarbSpeedBar fast={target.fastCarbs} medium={target.mediumCarbs} slow={target.slowCarbs} showHints />
          <Text style={styles.splitNote}>
            With {formatDuration(workout.startsInMinutes)} until you start, this split leans on the speeds your stomach can handle in
            time. Treat it as a practical estimate and adjust for your own tolerance.
          </Text>
        </View>
      ) : null}

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={19} color={strictlyColors.lime} />
        <Text style={styles.noteText}>{target.rationale}</Text>
      </View>

      <Text style={styles.sectionTitle}>How do you want to fuel?</Text>
      {action({ icon: "restaurant-outline", title: "Tell me what to eat", text: "Get a realistic meal scaled to this target.", onPress: () => navigation.navigate("MealIdeas"), primary: true })}
      {action({ icon: "basket-outline", title: "Use what I have", text: "Search your foods and build from what’s available.", onPress: () => navigation.navigate("BuildMeal") })}
      {action({ icon: "camera-outline", title: "Scan my meal", text: "Estimate your plate, then correct every item.", onPress: () => navigation.navigate("Main", { screen: "Scan" }) })}

      <View style={styles.intra}>
        <Text style={styles.intraEyebrow}>DURING THE WORKOUT</Text>
        <Text style={styles.intraValue}>
          {target.intraWorkout.required ? `${target.intraWorkout.lowPerHour}–${target.intraWorkout.highPerHour} g/hour` : "Not required"}
        </Text>
        <Text style={styles.intraText}>{target.intraWorkout.note}</Text>

        {target.intraWorkout.required ? (
          <>
            <View style={styles.packRow}>
              <View style={styles.packItem}>
                <Text style={styles.packLabel}>PLAN TO CONSUME</Text>
                <Text style={styles.packValue}>~{totalDuring}g</Text>
              </View>
              <View style={styles.packItem}>
                <Text style={styles.packLabel}>PACK WITH BUFFER</Text>
                <Text style={styles.packValue}>~{packTarget}g</Text>
              </View>
            </View>
            <Text style={styles.timelineTitle}>FUEL TIMELINE · {intervalGrams}G EVERY 30 MIN</Text>
            <View style={styles.timeline}>
              {timeline.map((point) => (
                <View key={point.minute} style={styles.timelinePoint}>
                  <Text style={styles.timelineTime}>
                    {Math.floor(point.minute / 60)}:{String(point.minute % 60).padStart(2, "0")}
                  </Text>
                  <View style={styles.timelineDot} />
                  <Text style={styles.timelineGrams}>{point.grams}g</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </View>

      <Text style={styles.disclaimer}>
        Strictly provides general sports-fuelling guidance, not medical advice. Individual needs and gastrointestinal tolerance vary.
      </Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft },

  splitToggle: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 15, marginTop: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  splitToggleText: { flex: 1, fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 },
  splitPanel: { padding: 15, marginTop: 8, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  splitNote: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 12 },

  note: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, marginTop: 12 },
  noteText: { flex: 1, fontFamily: strictlyType.sans, fontSize: 12, lineHeight: 18, color: strictlyColors.text },

  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 19, marginTop: 28, marginBottom: 10 },

  action: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, marginBottom: 9 },
  actionPrimary: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.lime, marginBottom: 9 },
  actionIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: strictlyColors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  actionIconPrimary: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(10,28,18,0.12)", alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1 },
  actionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 14 },
  actionTitlePrimary: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 14 },
  actionText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginTop: 3 },
  actionTextPrimary: { fontFamily: strictlyType.sans, color: strictlyColors.onLimeSoft, fontSize: 11, marginTop: 3 },

  intra: { padding: 18, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, marginTop: 20 },
  intraEyebrow: { fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.4, color: strictlyColors.textSoft },
  intraValue: { fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 26, color: strictlyColors.text, marginTop: 10 },
  intraText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 7 },
  packRow: { flexDirection: "row", gap: 10, padding: 13, marginTop: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.cream },
  packItem: { flex: 1 },
  packLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, letterSpacing: 0.7 },
  packValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 20, marginTop: 3 },
  timelineTitle: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, letterSpacing: 1, marginTop: 17, marginBottom: 6 },
  timeline: { paddingLeft: 3 },
  timelinePoint: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 10 },
  timelineTime: { width: 36, fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9 },
  timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: strictlyColors.lime },
  timelineGrams: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 11 },

  disclaimer: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 18 },
});
