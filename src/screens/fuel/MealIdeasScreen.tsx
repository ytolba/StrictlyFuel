import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { useSubscription } from "../../provider/RevenuCatProvider";
import { CURATED_MEAL_TEMPLATES, ingredientsForTemplate, type CuratedMealTemplate } from "../../data/mealTemplates";
import { calculateMealMacros } from "../../logic/nutritionEngine";
import { scaleMealToTarget } from "../../logic/mealScaling";
import { scoreMeal } from "../../logic/mealScore";
import { calculateMealTiming, formatDuration } from "../../logic/mealTiming";
import { loadNutritionProfile } from "../../services/nutritionProfileService";
import { EMPTY_NUTRITION_PROFILE, type NutritionProfile } from "../../types/nutritionProfile";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { CarbSpeedBar } from "../../components/fuel/CarbSpeedBar";
import { scoreColor, scoreLabel, strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type Recommendation = {
  template: CuratedMealTemplate;
  ingredients: ReturnType<typeof ingredientsForTemplate>;
  macros: ReturnType<typeof calculateMealMacros>;
  score: ReturnType<typeof scoreMeal>;
  timing: ReturnType<typeof calculateMealTiming>;
  rank: number;
};

const PAGE_SIZE = 3;

function fitsProfile(meal: CuratedMealTemplate, profile: NutritionProfile) {
  const excluded = new Set([...profile.sensitivities, ...profile.conditions]);
  if (meal.allergens.includes("dairy") && (excluded.has("dairy") || excluded.has("lactose"))) return false;
  if (meal.allergens.includes("gluten") && (excluded.has("gluten") || excluded.has("celiac"))) return false;
  if (profile.dietaryPatterns.includes("vegan") && !meal.dietaryTags.includes("vegan")) return false;
  if (profile.dietaryPatterns.includes("vegetarian") && !meal.dietaryTags.includes("vegetarian")) return false;
  if (profile.dietaryPatterns.includes("halal") && !meal.dietaryTags.includes("halal")) return false;
  return true;
}

export default function MealIdeasScreen({ navigation }: any) {
  const { workout, target, setIngredients } = useFuel();
  const { isPro, canReshuffle, reshufflesRemaining, consumeReshuffle, refreshUsage } = useSubscription();
  const [profile, setProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    loadNutritionProfile().then(setProfile);
    refreshUsage();
  }, [refreshUsage]);

  // The full eligible pool, best first. Reshuffling rotates a window over it
  // rather than re-ranking, so every option shown is still a genuine fit.
  const pool = useMemo<Recommendation[]>(() => {
    if (!workout || !target) return [];
    return CURATED_MEAL_TEMPLATES.filter((meal) => fitsProfile(meal, profile) && workout.durationMinutes >= meal.minWorkoutMinutes)
      .map((meal) => {
        const ingredients = scaleMealToTarget(ingredientsForTemplate(meal), target);
        const macros = calculateMealMacros(ingredients);
        const score = scoreMeal(macros, target, workout);
        const timing = calculateMealTiming(macros, workout);
        const activityMatch = meal.activityTypes.includes(workout.activityType) ? 16 : 0;
        const timingFit = Math.max(0, 20 - Math.abs(timing.bestMinutes - workout.startsInMinutes) / 5);
        return { template: meal, ingredients, macros, score, timing, rank: score.total + activityMatch + timingFit };
      })
      // A recommendation is a promise, not filler. Anything below 90 stays
      // available in the manual builder but is never presented as a pick.
      .filter((meal) => meal.score.total >= 90)
      .sort((a, b) => b.rank - a.rank)
      .filter((meal, index, all) => all.findIndex((other) => other.template.name === meal.template.name) === index);
  }, [profile, target, workout]);

  const visible = useMemo(() => {
    if (!pool.length) return [];
    return Array.from({ length: Math.min(PAGE_SIZE, pool.length) }, (_, index) => pool[(offset + index) % pool.length]);
  }, [pool, offset]);

  const hasMore = pool.length > PAGE_SIZE;

  const reshuffle = async () => {
    if (!hasMore) return;
    if (!canReshuffle) {
      return Alert.alert(
        "Reshuffles used up",
        "You've used this week's meal reshuffles. They reset Monday — or upgrade for many more.",
        [{ text: "Not now", style: "cancel" }, { text: "See Pro", onPress: () => navigation.navigate("Paywall") }]
      );
    }
    setOffset((current) => (current + PAGE_SIZE) % pool.length);
    await consumeReshuffle();
  };

  if (!workout || !target) {
    return (
      <ScreenShell title="Meal ideas" back onBack={() => navigation.goBack()}>
        <Text style={styles.empty}>Calculate a workout first.</Text>
      </ScreenShell>
    );
  }

  const useMeal = (meal: Recommendation) => {
    setIngredients(meal.ingredients);
    navigation.navigate("BuildMeal", { suggestedName: meal.template.name });
  };

  const card = (meal: Recommendation, best = false) => {
    const tint = scoreColor(meal.score.total);
    return (
      <View key={meal.template.id} style={[styles.card, best && styles.bestCard]}>
        <View style={styles.cardHead}>
          <View style={styles.cardCopy}>
            <Text style={styles.cardEyebrow}>{best ? "BEST MATCH" : "ALTERNATIVE"}</Text>
            <Text style={styles.cardTitle}>{meal.template.name}</Text>
          </View>
          <View style={[styles.score, { backgroundColor: tint }]}>
            <Text style={styles.scoreValue}>{meal.score.total}</Text>
            <Text style={styles.scoreLabel}>FUEL</Text>
          </View>
        </View>

        <Text style={[styles.band, { color: tint }]}>{scoreLabel(meal.score.total)} fit for this session</Text>

        <View style={styles.macroRow}>
          <Text style={styles.carbs}>
            {Math.round(meal.macros.carbs)}g <Text style={styles.carbsUnit}>carbs</Text>
          </Text>
          <Text style={styles.macro}>
            {Math.round(meal.macros.protein)}g protein · {Math.round(meal.macros.fat)}g fat
          </Text>
        </View>

        <CarbSpeedBar
          compact
          fast={meal.macros.fastCarbs}
          medium={meal.macros.mediumCarbs}
          slow={meal.macros.slowCarbs}
        />

        <View style={styles.timing}>
          <Ionicons name="time-outline" size={17} color={strictlyColors.text} />
          <View style={styles.timingCopy}>
            <Text style={styles.timingLabel}>BEST TIME</Text>
            <Text style={styles.timingValue}>
              {formatDuration(meal.timing.bestMinutes)} before · ideal {formatDuration(meal.timing.window[0])}–{formatDuration(meal.timing.window[1])}
            </Text>
          </View>
        </View>

        <View style={styles.ingredients}>
          {meal.ingredients.map((item) => (
            <Text key={item.id} style={styles.ingredient}>
              {item.food.emoji} {item.food.name} · {Math.round(item.grams)}g
            </Text>
          ))}
        </View>

        <TouchableOpacity style={[styles.use, best && styles.useBest]} onPress={() => useMeal(meal)}>
          <Text style={[styles.useText, best && styles.useTextBest]}>Use this meal</Text>
          <Ionicons name="arrow-forward" size={17} color={best ? strictlyColors.onLime : strictlyColors.lime} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenShell title="What to eat" eyebrow={`${target.carbTarget} G TARGET`} back onBack={() => navigation.goBack()}>
      <Text style={styles.intro}>Real meals, scaled to this workout. Every recommendation shown scores 90+ and allergies stay hard exclusions.</Text>

      {hasMore ? (
        <TouchableOpacity style={styles.reshuffle} onPress={reshuffle} activeOpacity={0.8}>
          <Ionicons name="shuffle" size={18} color={strictlyColors.onLime} />
          <View style={styles.reshuffleCopy}>
            <Text style={styles.reshuffleText}>Show me different meals</Text>
            <Text style={styles.reshuffleMeta}>
              {isPro ? `${pool.length} meals match` : `${reshufflesRemaining} reshuffle${reshufflesRemaining === 1 ? "" : "s"} left this week`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={strictlyColors.onLime} />
        </TouchableOpacity>
      ) : null}

      {visible[0] ? (
        card(visible[0], true)
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No safe match yet</Text>
          <Text style={styles.emptyText}>Try building from foods you already trust, or widen your profile in settings.</Text>
          <TouchableOpacity style={styles.emptyAction} onPress={() => navigation.navigate("BuildMeal")}>
            <Text style={styles.emptyActionText}>Build from what I have</Text>
          </TouchableOpacity>
        </View>
      )}

      {visible.length > 1 ? (
        <>
          <Text style={styles.moreTitle}>More good fits</Text>
          {visible.slice(1).map((meal) => card(meal))}
        </>
      ) : null}

      <Text style={styles.note}>
        Nutrition is calculated from the food library and the scaled portions. Strictly never invents a combination just because its
        macros happen to fit.
      </Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft },
  intro: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 19, marginBottom: 14 },

  reshuffle: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 58, paddingHorizontal: 15, marginBottom: 12, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.lime },
  reshuffleCopy: { flex: 1 },
  reshuffleText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 14 },
  reshuffleMeta: { fontFamily: strictlyType.sans, color: strictlyColors.onLimeSoft, fontSize: 10, marginTop: 2 },

  card: { padding: 16, marginBottom: 10, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large },
  bestCard: { borderColor: strictlyColors.borderStrong, backgroundColor: strictlyColors.surfaceMuted },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardCopy: { flex: 1 },
  cardEyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, letterSpacing: 1.1 },
  cardTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 18, lineHeight: 22, marginTop: 4 },
  score: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 16 },
  scoreLabel: { fontFamily: strictlyType.mono, color: strictlyColors.onLimeSoft, fontSize: 6 },
  band: { fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginTop: 10 },

  macroRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 10, marginBottom: 10 },
  carbs: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 25 },
  carbsUnit: { fontFamily: strictlyType.sans, fontWeight: "400", color: strictlyColors.textSoft, fontSize: 10 },
  macro: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9 },

  timing: { flexDirection: "row", alignItems: "center", gap: 9, padding: 11, marginTop: 12, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.cream },
  timingCopy: { flex: 1 },
  timingLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, letterSpacing: 1 },
  timingValue: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 11, marginTop: 3 },

  ingredients: { marginTop: 12, gap: 5 },
  ingredient: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11 },

  use: { height: 50, marginTop: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  useBest: { backgroundColor: strictlyColors.lime },
  useText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.lime, fontSize: 13 },
  useTextBest: { color: strictlyColors.onLime },

  moreTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 19, marginTop: 18, marginBottom: 10 },

  emptyCard: { padding: 22, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  emptyTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 16 },
  emptyText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 6 },
  emptyAction: { height: 48, marginTop: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  emptyActionText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 13 },

  note: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 8 },
});
