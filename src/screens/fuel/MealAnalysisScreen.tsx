import React, { useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { CarbSpeedBar } from "../../components/fuel/CarbSpeedBar";
import { calculateMealTiming, formatDuration } from "../../logic/mealTiming";
import { calculateHealthScore } from "../../logic/healthScore";
import { scoreColor, scoreLabel, strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

const STATUS_COLOR = {
  excellent: strictlyColors.good,
  good: strictlyColors.lime,
  adjust: strictlyColors.clay,
} as const;

export default function MealAnalysisScreen({ navigation, route }: any) {
  const { meals, target, workout } = useFuel();
  const [showImprove, setShowImprove] = useState(false);

  const meal = meals.find((item) => item.id === route.params?.mealId) || meals[0];
  const timing = useMemo(() => (meal && workout ? calculateMealTiming(meal.macros, workout) : null), [meal, workout]);
  const health = useMemo(() => (meal ? calculateHealthScore(meal.ingredients, meal.macros) : null), [meal]);

  const goHome = () => navigation.navigate("Main", { screen: "Home" });

  if (!meal || !target || !workout || !timing || !health) {
    return (
      <ScreenShell title="Meal analysis" back onBack={() => navigation.goBack()}>
        <Text style={styles.missing}>This meal is no longer available.</Text>
      </ScreenShell>
    );
  }

  const fuelTint = scoreColor(meal.score.total);
  const healthTint = scoreColor(health.score);

  const doneButton = (
    <TouchableOpacity style={styles.done} onPress={goHome} hitSlop={8} accessibilityLabel="Done, back to home">
      <Text style={styles.doneText}>Done</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenShell
      title="Meal analysis"
      eyebrow={meal.isEstimate ? "CAMERA ESTIMATE" : "DATABASE CALCULATION"}
      back
      onBack={() => navigation.goBack()}
      action={doneButton}
    >
      {meal.imageUri ? <Image source={{ uri: meal.imageUri }} style={styles.photo} /> : null}

      {/* Fuel score — the headline number, coloured by band. */}
      <View style={[styles.scoreCard, { borderColor: fuelTint }]}>
        <View style={[styles.scoreCircle, { backgroundColor: fuelTint }]}>
          <Text style={styles.scoreValue}>{meal.score.total}</Text>
          <Text style={styles.scoreOut}>/100</Text>
        </View>
        <View style={styles.scoreCopy}>
          <Text style={[styles.scoreBand, { color: fuelTint }]}>{scoreLabel(meal.score.total)} fuel</Text>
          <Text style={styles.scoreTitle}>{meal.score.headline}</Text>
          <Text style={styles.scoreText}>{meal.score.summary}</Text>
        </View>
      </View>

      <View style={styles.fit}>
        <Text style={styles.fitLabel}>FOR THIS WORKOUT</Text>
        <Text style={styles.fitText}>{meal.name}</Text>
        <Text style={styles.fitCarbs}>
          {Math.round(meal.macros.carbs)} g <Text style={styles.fitUnit}>of {target.carbTarget} g target</Text>
        </Text>
        <CarbSpeedBar
          fast={meal.macros.fastCarbs}
          medium={meal.macros.mediumCarbs}
          slow={meal.macros.slowCarbs}
          target={{ fast: target.fastCarbs, medium: target.mediumCarbs, slow: target.slowCarbs }}
        />
      </View>

      <View style={styles.eatCard}>
        <View style={styles.eatIcon}>
          <Ionicons name="time-outline" size={22} color={strictlyColors.lime} />
        </View>
        <View style={styles.eatCopy}>
          <Text style={styles.eatLabel}>EAT AROUND</Text>
          <Text style={styles.eatTime}>{timing.eatInMinutes <= 5 ? "Now" : timing.eatAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
          <Text style={styles.eatWindow}>
            Best {formatDuration(timing.bestMinutes)} before · ideal {formatDuration(timing.window[0])}–{formatDuration(timing.window[1])}
          </Text>
        </View>
      </View>

      {/* Health rating is shown to everyone, and anyone can ask how to raise it. */}
      <View style={styles.health}>
        <View style={styles.healthHead}>
          <View style={styles.healthCopy}>
            <Text style={styles.healthLabel}>HEALTH RATING</Text>
            <Text style={[styles.healthScore, { color: healthTint }]}>
              {health.score}
              <Text style={styles.healthOut}> / 100 · {scoreLabel(health.score)}</Text>
            </Text>
          </View>
          <View style={[styles.healthChip, { backgroundColor: healthTint }]}>
            <Ionicons name="leaf-outline" size={19} color={strictlyColors.onLime} />
          </View>
        </View>
        <Text style={styles.healthNote}>{health.note} This is separate from your Fuel Score and never changes it.</Text>

        {health.suggestions.length ? (
          <>
            <TouchableOpacity style={styles.improve} onPress={() => setShowImprove((current) => !current)} accessibilityRole="button">
              <Ionicons name={showImprove ? "chevron-up" : "sparkles-outline"} size={16} color={strictlyColors.text} />
              <Text style={styles.improveText}>{showImprove ? "Hide suggestions" : "How do I improve this?"}</Text>
            </TouchableOpacity>
            {showImprove ? (
              <View style={styles.suggestions}>
                {health.suggestions.map((suggestion) => (
                  <View key={suggestion.id} style={styles.suggestion}>
                    <View style={styles.suggestionGain}>
                      <Text style={styles.suggestionGainText}>+{suggestion.gain}</Text>
                    </View>
                    <View style={styles.suggestionCopy}>
                      <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                      <Text style={styles.suggestionText}>{suggestion.detail}</Text>
                    </View>
                  </View>
                ))}
                <Text style={styles.suggestionNote}>Estimated gains are approximate and assume the rest of the meal stays the same.</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.healthClean}>No obvious improvements — this is already a well-balanced plate.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Why it scored this way</Text>
      {meal.score.components.map((component) => (
        <View key={component.id} style={styles.component}>
          <View style={[styles.status, { backgroundColor: STATUS_COLOR[component.status] }]} />
          <View style={styles.componentCopy}>
            <View style={styles.componentTop}>
              <Text style={styles.componentTitle}>{component.label}</Text>
              <Text style={[styles.componentScore, { color: STATUS_COLOR[component.status] }]}>
                {component.score}/{component.maxScore}
              </Text>
            </View>
            <Text style={styles.componentText}>{component.detail}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.fix} onPress={() => navigation.navigate("FixMeal", { mealId: meal.id })}>
        <View style={styles.fixCopy}>
          <Text style={styles.fixTitle}>Fix my meal</Text>
          <Text style={styles.fixText}>Make the smallest changes for a better fit.</Text>
        </View>
        <Ionicons name="arrow-forward" size={19} color={strictlyColors.onLime} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.share} onPress={() => navigation.navigate("ShareFuel", { mealId: meal.id })}>
        <Ionicons name="share-outline" size={18} color={strictlyColors.text} />
        <Text style={styles.shareText}>Share your fuel</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.home} onPress={goHome}>
        <Ionicons name="home-outline" size={17} color={strictlyColors.textSoft} />
        <Text style={styles.homeText}>Back to today</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        {meal.isEstimate
          ? "Estimated values came from a photograph. Confirmed foods and measured quantities produce more reliable totals. "
          : ""}
        Fuel Score reflects workout-fuelling suitability for this session and timing window. Neither rating is medical advice.
      </Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  missing: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft },
  photo: { width: "100%", height: 220, borderRadius: strictlyRadius.large, marginBottom: 12, backgroundColor: strictlyColors.surfaceMuted },

  done: { paddingHorizontal: 14, height: 36, borderRadius: strictlyRadius.pill, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted },
  doneText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 12 },

  scoreCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.large, borderWidth: 2 },
  scoreCircle: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 29, lineHeight: 31 },
  scoreOut: { fontFamily: strictlyType.mono, color: strictlyColors.onLimeSoft, fontSize: 8 },
  scoreCopy: { flex: 1 },
  scoreBand: { fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" },
  scoreTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 21, letterSpacing: -0.5, marginTop: 5 },
  scoreText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 5 },

  fit: { padding: 17, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, marginTop: 12 },
  fitLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, letterSpacing: 1.2 },
  fitText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 17, marginTop: 8 },
  fitCarbs: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 28, marginTop: 7, marginBottom: 12 },
  fitUnit: { fontFamily: strictlyType.sans, fontWeight: "400", color: strictlyColors.textSoft, fontSize: 11 },

  eatCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginTop: 10, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.ink },
  eatIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: strictlyColors.inkSoft, alignItems: "center", justifyContent: "center" },
  eatCopy: { flex: 1 },
  eatLabel: { fontFamily: strictlyType.mono, color: strictlyColors.sage, fontSize: 7, letterSpacing: 1.1 },
  eatTime: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.white, fontSize: 24, marginTop: 3 },
  eatWindow: { fontFamily: strictlyType.sans, color: strictlyColors.sage, fontSize: 9, marginTop: 3 },

  health: { padding: 16, marginTop: 10, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream },
  healthHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  healthCopy: { flex: 1 },
  healthLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, letterSpacing: 1 },
  healthScore: { fontFamily: strictlyType.sansMedium, fontWeight: "900", fontSize: 26, marginTop: 5 },
  healthOut: { fontFamily: strictlyType.sans, fontWeight: "400", fontSize: 11, color: strictlyColors.textSoft },
  healthChip: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  healthNote: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 8 },
  healthClean: { fontFamily: strictlyType.sans, color: strictlyColors.good, fontSize: 11, lineHeight: 16, marginTop: 8 },

  improve: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, marginTop: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  improveText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 12 },
  suggestions: { marginTop: 10, gap: 8 },
  suggestion: { flexDirection: "row", gap: 11, padding: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surface },
  suggestionGain: { minWidth: 38, height: 30, paddingHorizontal: 7, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  suggestionGainText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 11 },
  suggestionCopy: { flex: 1 },
  suggestionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 12 },
  suggestionText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 4 },
  suggestionNote: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 2 },

  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 18, marginTop: 25, marginBottom: 9 },
  component: { flexDirection: "row", gap: 11, padding: 14, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, marginBottom: 8 },
  status: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  componentCopy: { flex: 1 },
  componentTop: { flexDirection: "row", justifyContent: "space-between" },
  componentTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 13 },
  componentScore: { fontFamily: strictlyType.mono, fontSize: 10 },
  componentText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 5 },

  fix: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 17, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.large, marginTop: 13 },
  fixCopy: { flex: 1 },
  fixTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 16 },
  fixText: { fontFamily: strictlyType.sans, color: strictlyColors.onLimeSoft, fontSize: 11, marginTop: 3 },

  share: { height: 54, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.borderStrong, borderRadius: strictlyRadius.medium, marginTop: 9 },
  shareText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text },

  home: { height: 48, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", marginTop: 4 },
  homeText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.textSoft, fontSize: 12 },

  disclaimer: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14, marginTop: 12 },
});
