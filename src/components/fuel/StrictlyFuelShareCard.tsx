import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { getActivity } from "../../data/activities";
import type { FuelMeal, WorkoutDraft } from "../../types/fuel";

import { strictlyType } from "../../theme/strictlyTheme";
/** Fixed artwork colors: the card is exported as an image, so it never follows the app appearance. */
const cardColors = {
  ground: "#08090A",
  lift: "#16191B",
  text: "#F4F5F4",
  textSoft: "#A2AAA6",
  lime: "#CDF564",
  line: "rgba(244,245,244,0.14)",
  glass: "rgba(8,9,10,0.78)",
};

const BrandMark = ({ size = 24 }: { size?: number }) => (
  <Svg width={size * (84 / 102)} height={size} viewBox="26 13 84 102">
    <Path d="M72 17 30 68h31l-5 43 42-55H67z" fill={cardColors.lime} />
    <Circle cx={98} cy={25} r={8} fill={cardColors.text} />
  </Svg>
);

function Macro({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>{Math.round(value)}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

export function StrictlyFuelShareCard({
  meal,
  workout,
  onPhotoLoadEnd,
}: {
  meal: FuelMeal;
  workout: WorkoutDraft;
  onPhotoLoadEnd?: () => void;
}) {
  const activity = getActivity(workout.activityType);
  const ingredientEmoji = meal.ingredients.slice(0, 4).map((item) => item.food.emoji).join("  ");
  const timing = workout.startsInMinutes < 60
    ? `${workout.startsInMinutes} min before`
    : `${Math.floor(workout.startsInMinutes / 60)}h${workout.startsInMinutes % 60 ? ` ${workout.startsInMinutes % 60}m` : ""} before`;

  return (
    <View style={styles.card} collapsable={false}>
      <View style={styles.photoFrame}>
        {meal.imageUri ? (
          <Image source={{ uri: meal.imageUri }} style={styles.photo} resizeMode="cover" onLoadEnd={onPhotoLoadEnd} />
        ) : (
          <LinearGradient colors={[cardColors.lift, "#202427"]} style={styles.photoPlaceholder}>
            {ingredientEmoji ? <Text style={styles.photoEmoji}>{ingredientEmoji}</Text> : <BrandMark size={64} />}
          </LinearGradient>
        )}
        <LinearGradient
          colors={["rgba(8,9,10,0.10)", "rgba(8,9,10,0.24)", cardColors.ground]}
          locations={[0, 0.62, 1]}
          style={styles.photoShade}
        />
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <BrandMark />
            <Text style={styles.brandName}>StrictlyFuel</Text>
          </View>
          <View style={styles.fuelPill}>
            <Text style={styles.fuelPillText}>Pre-workout fuel</Text>
          </View>
        </View>
        <View style={styles.photoCopy}>
          <Text style={styles.activity}>{activity.label} · {workout.durationMinutes} min</Text>
          <Text numberOfLines={2} style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.timing}>{timing}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.heroStats}>
          <View style={styles.carbStat}>
            <Text style={styles.heroValue}>{Math.round(meal.macros.carbs)}g</Text>
            <Text style={styles.heroLabel}>Carbohydrates</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Strictly score</Text>
            <View style={styles.scoreLine}>
              <Text style={styles.scoreValue}>{Math.round(meal.score.total)}</Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
          </View>
        </View>

        <View style={styles.macros}>
          <Macro value={meal.macros.protein} label="Protein" />
          <View style={styles.divider} />
          <Macro value={meal.macros.fat} label="Fat" />
          <View style={styles.divider} />
          <Macro value={meal.macros.fiber} label="Fiber" />
          <View style={styles.divider} />
          <View style={styles.macro}>
            <Text style={styles.macroValue}>{Math.round(meal.macros.calories)}</Text>
            <Text style={styles.macroLabel}>Calories</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerCopy} numberOfLines={2}>{meal.isEstimate ? "Photo estimate · edited by athlete" : "Built for this workout"}</Text>
          <Text style={styles.footerUrl}>strictlyinc.com</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 320, height: 568, overflow: "hidden", backgroundColor: cardColors.ground },
  photoFrame: { height: 330, backgroundColor: cardColors.lift },
  photo: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  photoPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  photoEmoji: { fontSize: 42, letterSpacing: 7 },
  photoShade: { ...StyleSheet.absoluteFillObject },
  brandRow: { position: "absolute", top: 18, left: 18, right: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { color: cardColors.text, fontSize: 15, fontFamily: strictlyType.bold, letterSpacing: -0.3 },
  fuelPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: cardColors.glass, borderWidth: 1, borderColor: cardColors.line },
  fuelPillText: { color: cardColors.text, fontSize: 11, fontFamily: strictlyType.semibold },
  photoCopy: { position: "absolute", left: 18, right: 18, bottom: 16 },
  activity: { color: cardColors.lime, fontSize: 12, fontFamily: strictlyType.bold },
  mealName: { color: cardColors.text, fontSize: 27, lineHeight: 30, fontFamily: strictlyType.bold, letterSpacing: -0.8, marginTop: 6 },
  timing: { color: cardColors.textSoft, fontSize: 12, fontFamily: strictlyType.medium, marginTop: 6 },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  heroStats: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  carbStat: { flex: 1, justifyContent: "center" },
  heroValue: { color: cardColors.text, fontSize: 38, lineHeight: 40, fontFamily: strictlyType.bold, letterSpacing: -1.6, fontVariant: ["tabular-nums"] },
  heroLabel: { color: cardColors.textSoft, fontSize: 11, fontFamily: strictlyType.semibold, marginTop: 2 },
  scoreCard: { minWidth: 112, minHeight: 68, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, justifyContent: "space-between", backgroundColor: cardColors.lime },
  scoreLine: { flexDirection: "row", alignItems: "baseline" },
  scoreValue: { color: cardColors.ground, fontSize: 27, lineHeight: 29, fontFamily: strictlyType.bold, letterSpacing: -1, fontVariant: ["tabular-nums"] },
  scoreOutOf: { color: cardColors.ground, opacity: 0.7, fontSize: 11, fontFamily: strictlyType.bold, marginLeft: 2 },
  scoreLabel: { color: cardColors.ground, fontSize: 11, fontFamily: strictlyType.bold },
  macros: { height: 56, borderTopWidth: 1, borderBottomWidth: 1, borderColor: cardColors.line, marginTop: 13, flexDirection: "row", alignItems: "center" },
  macro: { flex: 1, alignItems: "center" },
  macroValue: { color: cardColors.text, fontSize: 14, fontFamily: strictlyType.bold, fontVariant: ["tabular-nums"] },
  macroLabel: { color: cardColors.textSoft, fontSize: 11, fontFamily: strictlyType.medium, marginTop: 2 },
  divider: { width: 1, height: 24, backgroundColor: cardColors.line },
  footer: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10 },
  footerCopy: { flex: 1, color: cardColors.textSoft, fontSize: 11, fontFamily: strictlyType.medium },
  footerUrl: { color: cardColors.lime, fontSize: 11, fontFamily: strictlyType.bold },
});
