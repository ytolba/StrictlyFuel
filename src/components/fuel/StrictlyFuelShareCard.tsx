import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polygon } from "react-native-svg";
import { getActivity } from "../../data/activities";
import type { FuelMeal, WorkoutDraft } from "../../types/fuel";

const cardColors = {
  forest: "#102A1C",
  forestLift: "#173924",
  cream: "#F4EBD7",
  creamSoft: "#D8CFBA",
  lime: "#D8E66B",
  line: "rgba(244,235,215,0.18)",
  glass: "rgba(8,26,16,0.78)",
};

const BrandMark = () => (
  <Svg width={22} height={25} viewBox="0 0 100 113.2">
    <Polygon
      points="61.4,0 100,0 82.6,16.4 68.5,16.5 25.1,55.5 25,63 33.1,63.3 65.7,34.4 93.2,34.2 93.3,63.7 38.6,113.2 0,113.2 17.4,96.8 31.5,96.7 74.9,57.7 75,50.2 66.9,49.9 34.3,78.8 6.8,79 6.7,49.5"
      fill={cardColors.cream}
    />
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
          <LinearGradient colors={[cardColors.forestLift, "#2B5138"]} style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>{ingredientEmoji || "⚡"}</Text>
          </LinearGradient>
        )}
        <LinearGradient
          colors={["rgba(16,42,28,0.10)", "rgba(16,42,28,0.22)", cardColors.forest]}
          locations={[0, 0.62, 1]}
          style={styles.photoShade}
        />
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <BrandMark />
            <Text style={styles.brandName}>STRICTLY</Text>
          </View>
          <View style={styles.fuelPill}>
            <Text style={styles.fuelPillText}>PRE-WORKOUT FUEL</Text>
          </View>
        </View>
        <View style={styles.photoCopy}>
          <Text style={styles.activity}>{activity.label.toUpperCase()} · {workout.durationMinutes} MIN</Text>
          <Text numberOfLines={2} style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.timing}>{timing}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.heroStats}>
          <View style={styles.carbStat}>
            <Text style={styles.heroValue}>{Math.round(meal.macros.carbs)}g</Text>
            <Text style={styles.heroLabel}>CARBOHYDRATES</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>STRICTLY SCORE</Text>
            <View style={styles.scoreLine}>
              <Text style={styles.scoreValue}>{Math.round(meal.score.total)}</Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
          </View>
        </View>

        <View style={styles.macros}>
          <Macro value={meal.macros.protein} label="PROTEIN" />
          <View style={styles.divider} />
          <Macro value={meal.macros.fat} label="FAT" />
          <View style={styles.divider} />
          <Macro value={meal.macros.fiber} label="FIBER" />
          <View style={styles.divider} />
          <View style={styles.macro}>
            <Text style={styles.macroValue}>{Math.round(meal.macros.calories)}</Text>
            <Text style={styles.macroLabel}>CALORIES</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerCopy}>{meal.isEstimate ? "PHOTO ESTIMATE · EDITED BY ATHLETE" : "BUILT FOR THIS WORKOUT"}</Text>
          <Text style={styles.footerUrl}>STRICTLYFUEL</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 320, height: 568, overflow: "hidden", backgroundColor: cardColors.forest },
  photoFrame: { height: 330, backgroundColor: cardColors.forestLift },
  photo: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  photoPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  photoEmoji: { fontSize: 42, letterSpacing: 7 },
  photoShade: { ...StyleSheet.absoluteFillObject },
  brandRow: { position: "absolute", top: 18, left: 18, right: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandName: { color: cardColors.cream, fontSize: 12, fontWeight: "800", letterSpacing: 2.2 },
  fuelPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: cardColors.glass, borderWidth: 1, borderColor: cardColors.line },
  fuelPillText: { color: cardColors.cream, fontSize: 6.5, fontWeight: "800", letterSpacing: 1.25 },
  photoCopy: { position: "absolute", left: 18, right: 18, bottom: 16 },
  activity: { color: cardColors.lime, fontSize: 7.5, fontWeight: "800", letterSpacing: 1.45 },
  mealName: { color: cardColors.cream, fontSize: 27, lineHeight: 29, fontWeight: "800", letterSpacing: -0.8, marginTop: 7 },
  timing: { color: cardColors.creamSoft, fontSize: 9, fontWeight: "600", marginTop: 7 },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  heroStats: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  carbStat: { flex: 1, justifyContent: "center" },
  heroValue: { color: cardColors.cream, fontSize: 37, lineHeight: 39, fontWeight: "900", letterSpacing: -1.8 },
  heroLabel: { color: cardColors.creamSoft, fontSize: 6.5, fontWeight: "800", letterSpacing: 1.45, marginTop: 3 },
  scoreCard: { minWidth: 102, minHeight: 66, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, justifyContent: "space-between", backgroundColor: cardColors.lime },
  scoreLine: { flexDirection: "row", alignItems: "baseline" },
  scoreValue: { color: cardColors.forest, fontSize: 27, lineHeight: 29, fontWeight: "900", letterSpacing: -1 },
  scoreOutOf: { color: cardColors.forest, opacity: 0.68, fontSize: 8, fontWeight: "800", marginLeft: 2 },
  scoreLabel: { color: cardColors.forest, fontSize: 5.8, fontWeight: "900", letterSpacing: 1.05 },
  macros: { height: 54, borderTopWidth: 1, borderBottomWidth: 1, borderColor: cardColors.line, marginTop: 13, flexDirection: "row", alignItems: "center" },
  macro: { flex: 1, alignItems: "center" },
  macroValue: { color: cardColors.cream, fontSize: 13, fontWeight: "800" },
  macroLabel: { color: cardColors.creamSoft, fontSize: 5.5, fontWeight: "700", letterSpacing: 0.8, marginTop: 3 },
  divider: { width: 1, height: 23, backgroundColor: cardColors.line },
  footer: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  footerCopy: { color: cardColors.creamSoft, fontSize: 5.5, fontWeight: "700", letterSpacing: 0.8 },
  footerUrl: { color: cardColors.lime, fontSize: 7, fontWeight: "900", letterSpacing: 1.4 },
});
