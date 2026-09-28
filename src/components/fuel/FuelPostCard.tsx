import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FuelPost } from "../../types/fuel";
import { scoreColor, strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";
import { CarbSpeedBar } from "./CarbSpeedBar";

export function FuelPostCard({ post, saved, onPress, onSave, onCopy, onDelete }: { post: FuelPost; saved: boolean; onPress: () => void; onSave: () => void; onCopy: () => void; onDelete?: () => void }) {
  const { meal, workout } = post;
  return <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.card}>
    {meal.imageUri ? <Image source={{ uri: meal.imageUri }} style={styles.image} /> : <View style={styles.placeholder}><Text style={styles.emoji}>{meal.ingredients.slice(0, 4).map((item) => item.food.emoji).join("  ")}</Text></View>}
    <View style={styles.body}>
      <View style={styles.author}><View style={styles.authorCopy}><View style={styles.authorName}><Text style={styles.username}>@{post.username}</Text>{post.isDemo ? <Text style={styles.example}>STRICTLY EXAMPLE</Text> : onDelete ? <Text style={styles.yours}>YOUR POST</Text> : null}</View><Text style={styles.context}>{sentence(workout.activityType)} · {workout.durationMinutes} min · ate {workout.startsInMinutes} min before</Text></View><View accessible accessibilityLabel={`Strictly score ${meal.score.total} out of 100`} style={[styles.score, { backgroundColor: scoreColor(meal.score.total) }]}><Text style={styles.scoreValue}>{meal.score.total}</Text></View></View>
      <Text style={styles.mealName}>{meal.name}</Text>
      <Text style={styles.carbs}>{Math.round(meal.macros.carbs)}g <Text style={styles.carbsLabel}>carbohydrates</Text></Text>
      <CarbSpeedBar compact fast={meal.macros.fastCarbs} medium={meal.macros.mediumCarbs} slow={meal.macros.slowCarbs} unknown={meal.macros.unclassifiedCarbs} />
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
      <View style={styles.actions}>
        {onDelete ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete your post" style={styles.utility} onPress={(event) => { event.stopPropagation(); onDelete(); }}><Ionicons name="trash-outline" size={17} color={strictlyColors.danger} /><Text style={[styles.utilityText, styles.deleteText]}>Delete</Text></TouchableOpacity> : null}
        <TouchableOpacity style={styles.utility} onPress={(event) => { event.stopPropagation(); onSave(); }}><Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={17} color={strictlyColors.text} /><Text style={styles.utilityText}>{post.isDemo ? saved ? "Example saved" : "Save example" : `${post.saves + (saved ? 1 : 0)} saves`}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.copy} onPress={(event) => { event.stopPropagation(); onCopy(); }}><Ionicons name="copy-outline" size={16} color={strictlyColors.onLime} /><Text style={styles.copyText}>Copy meal</Text></TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>;
}

// "hyrox" → "Hyrox": only the first word is capitalized, not "Ate 90 Min Before".
const sentence = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const styles = StyleSheet.create({
  card: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, overflow: "hidden", marginBottom: 14 },
  image: { width: "100%", height: 220, backgroundColor: strictlyColors.surfaceMuted },
  placeholder: { height: 175, backgroundColor: strictlyColors.cream, alignItems: "center", justifyContent: "center", padding: 20 },
  emoji: { fontSize: 33, letterSpacing: 7 },
  body: { padding: 16 },
  author: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  authorCopy: { flex: 1, paddingRight: 10 }, authorName: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  username: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 13 },
  example: { paddingHorizontal: 7, paddingVertical: 4, overflow: "hidden", borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.cream, fontFamily: strictlyType.semibold, color: strictlyColors.accentText, fontSize: 11, letterSpacing: 1.1 },
  context: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 12, marginTop: 4 },
  score: { alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 23, backgroundColor: strictlyColors.lime },
  scoreValue: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 18, letterSpacing: -0.3 },
  yours: { paddingHorizontal: 7, paddingVertical: 4, overflow: "hidden", borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surfaceMuted, fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1 },
  deleteText: { color: strictlyColors.danger },
  mealName: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 20, letterSpacing: -0.4, marginTop: 13 },
  carbs: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 26, marginTop: 7, marginBottom: 11 },
  carbsLabel: { fontFamily: strictlyType.regular,  color: strictlyColors.textSoft, fontSize: 12 },
  caption: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 13 },
  actions: { flexDirection: "row", gap: 18, alignItems: "center", marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: strictlyColors.border },
  utility: { flexDirection: "row", alignItems: "center", gap: 6 },
  utilityText: { fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 11 },
  copy: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.pill, paddingHorizontal: 13, paddingVertical: 9 },
  copyText: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime, fontSize: 11 },
});
