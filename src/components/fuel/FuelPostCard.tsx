import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FuelPost } from "../../types/fuel";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";
import { CarbSpeedBar } from "./CarbSpeedBar";

export function FuelPostCard({ post, saved, onPress, onSave, onCopy }: { post: FuelPost; saved: boolean; onPress: () => void; onSave: () => void; onCopy: () => void }) {
  const { meal, workout } = post;
  return <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.card}>
    {meal.imageUri ? <Image source={{ uri: meal.imageUri }} style={styles.image} /> : <View style={styles.placeholder}><Text style={styles.emoji}>{meal.ingredients.slice(0, 4).map((item) => item.food.emoji).join("  ")}</Text><Text style={styles.placeholderText}>{meal.name}</Text></View>}
    <View style={styles.body}>
      <View style={styles.author}><View><Text style={styles.username}>@{post.username}</Text><Text style={styles.context}>{workout.activityType} · {workout.durationMinutes} min · ate {workout.startsInMinutes} min before</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{meal.score.total}</Text><Text style={styles.scoreLabel}>SCORE</Text></View></View>
      <Text style={styles.mealName}>{meal.name}</Text>
      <Text style={styles.carbs}>{Math.round(meal.macros.carbs)}g <Text style={styles.carbsLabel}>carbohydrates</Text></Text>
      <CarbSpeedBar compact fast={meal.macros.fastCarbs} medium={meal.macros.mediumCarbs} slow={meal.macros.slowCarbs} />
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.utility} onPress={(event) => { event.stopPropagation(); onSave(); }}><Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={17} color={strictlyColors.ink} /><Text style={styles.utilityText}>{post.saves + (saved ? 1 : 0)} saves</Text></TouchableOpacity>
        <TouchableOpacity style={styles.copy} onPress={(event) => { event.stopPropagation(); onCopy(); }}><Ionicons name="copy-outline" size={16} color={strictlyColors.ink} /><Text style={styles.copyText}>Copy meal</Text></TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, overflow: "hidden", marginBottom: 14 },
  image: { width: "100%", height: 220, backgroundColor: strictlyColors.surfaceMuted },
  placeholder: { height: 175, backgroundColor: strictlyColors.cream, alignItems: "center", justifyContent: "center", padding: 20 },
  emoji: { fontSize: 33, letterSpacing: 7 },
  placeholderText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 14, marginTop: 16 },
  body: { padding: 16 },
  author: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  username: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 13 },
  context: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, marginTop: 4, textTransform: "capitalize" },
  score: { alignItems: "center", justifyContent: "center", width: 45, height: 45, borderRadius: 23, backgroundColor: strictlyColors.lime },
  scoreValue: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 16, lineHeight: 17 },
  scoreLabel: { fontFamily: strictlyType.mono, fontSize: 6, letterSpacing: 0.6, color: strictlyColors.ink },
  mealName: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 20, letterSpacing: -0.4, marginTop: 13 },
  carbs: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 26, marginTop: 7, marginBottom: 11 },
  carbsLabel: { fontFamily: strictlyType.sans, fontWeight: "400", color: strictlyColors.textSoft, fontSize: 12 },
  caption: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 13 },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: strictlyColors.border },
  utility: { flexDirection: "row", alignItems: "center", gap: 6 },
  utilityText: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 11 },
  copy: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.pill, paddingHorizontal: 13, paddingVertical: 9 },
  copyText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 11 },
});

