import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { COMMUNITY_SEED } from "../../data/communitySeed";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function MyFuelScreen({ navigation }: any) {
  const { meals, savedPostIds, localPosts, setIngredients } = useFuel();
  const saved = [...localPosts, ...COMMUNITY_SEED].filter((post) => savedPostIds.includes(post.id));
  return <ScreenShell>
    <Text style={styles.eyebrow}>MY FUEL</Text><Text style={styles.title}>Meals that work for you.</Text><Text style={styles.subtitle}>Your private log, saved inspiration, and repeatable pre-workout routines.</Text>
    <View style={styles.stats}>{[[meals.length, "Logged"], [saved.length, "Saved"], [localPosts.length, "Shared"]].map(([value, label]) => <View key={label} style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Recent meals</Text><Text style={styles.sectionMeta}>{meals.length} total</Text></View>
    {meals.slice(0, 8).map((meal) => <TouchableOpacity key={meal.id} onPress={() => navigation.getParent()?.navigate("MealAnalysis", { mealId: meal.id })} style={styles.meal}>
      {meal.imageUri ? <Image source={{ uri: meal.imageUri }} style={styles.thumbnail} /> : <View style={styles.thumbnailPlaceholder}><Text>{meal.ingredients.slice(0, 2).map((item) => item.food.emoji).join("")}</Text></View>}
      <View style={styles.mealCopy}><Text style={styles.mealName}>{meal.name}</Text><Text style={styles.mealMeta}>{Math.round(meal.macros.carbs)}g carbs · score {meal.score.total}</Text><Text style={styles.mealDate}>{new Date(meal.createdAt).toLocaleDateString()}</Text></View>
      <TouchableOpacity style={styles.repeat} onPress={() => { setIngredients(meal.ingredients.map((item) => ({ ...item, id: `${item.id}-repeat-${Date.now()}` }))); navigation.getParent()?.navigate("BuildMeal"); }}><Ionicons name="refresh" size={17} color={strictlyColors.onLime} /></TouchableOpacity>
    </TouchableOpacity>)}
    {!meals.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>Your fuel library starts here</Text><Text style={styles.emptyText}>Meals you score or scan stay private and appear here automatically.</Text></View> : null}
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Saved meals</Text><TouchableOpacity onPress={() => navigation.getParent()?.navigate("SavedMeals")}><Text style={styles.link}>See all</Text></TouchableOpacity></View>
    {saved.slice(0, 3).map((post) => <TouchableOpacity key={post.id} style={styles.saved} onPress={() => navigation.getParent()?.navigate("FuelPostDetail", { post })}><Text style={styles.savedEmoji}>{post.meal.ingredients.slice(0, 3).map((item) => item.food.emoji).join(" ")}</Text><View style={styles.savedCopy}><Text style={styles.mealName}>{post.meal.name}</Text><Text style={styles.mealMeta}>{post.workout.activityType} · {Math.round(post.meal.macros.carbs)}g carbs</Text></View><Ionicons name="chevron-forward" size={17} color={strictlyColors.textSoft} /></TouchableOpacity>)}
    {!saved.length ? <TouchableOpacity style={styles.savedEmpty} onPress={() => navigation.navigate("Discover")}><Ionicons name="bookmark-outline" size={22} color={strictlyColors.text} /><Text style={styles.savedEmptyText}>Save useful community meals to find them here.</Text></TouchableOpacity> : null}
  </ScreenShell>;
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9, letterSpacing: 1.5, marginTop: 9 },
  title: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 32, letterSpacing: -1, marginTop: 7 },
  subtitle: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 7 },
  stats: { flexDirection: "row", gap: 8, marginTop: 20 },
  stat: { flex: 1, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, padding: 14 },
  statValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 24 },
  statLabel: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, textTransform: "uppercase", marginTop: 3 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 27, marginBottom: 10 },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 18 },
  sectionMeta: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8 },
  link: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 10 },
  meal: { flexDirection: "row", alignItems: "center", gap: 11, padding: 10, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, marginBottom: 8 },
  thumbnail: { width: 52, height: 52, borderRadius: 10 },
  thumbnailPlaceholder: { width: 52, height: 52, borderRadius: 10, backgroundColor: strictlyColors.cream, alignItems: "center", justifyContent: "center" },
  mealCopy: { flex: 1 },
  mealName: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 12 },
  mealMeta: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, marginTop: 3, textTransform: "capitalize" },
  mealDate: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 7, marginTop: 4 },
  repeat: { width: 34, height: 34, borderRadius: 17, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: 25, borderWidth: 1, borderColor: strictlyColors.border, borderStyle: "dashed", borderRadius: strictlyRadius.large },
  emptyTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 15 },
  emptyText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 5 },
  saved: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, marginBottom: 8 },
  savedEmoji: { fontSize: 17, minWidth: 57 },
  savedCopy: { flex: 1 },
  savedEmpty: { flexDirection: "row", gap: 10, alignItems: "center", padding: 17, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium },
  savedEmptyText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 11, lineHeight: 16 },
});

