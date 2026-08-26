import React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COMMUNITY_SEED } from "../../data/communitySeed";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { removeSavedCommunityMeal, saveCommunityMeal } from "../../services/fuelService";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { CarbSpeedBar } from "../../components/fuel/CarbSpeedBar";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function FuelPostDetailScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { target, localPosts, savedPostIds, toggleSavedPost, importPostMeal } = useFuel();
  const post = route.params?.post || [...localPosts, ...COMMUNITY_SEED].find((item) => item.id === route.params?.postId);
  if (!post) return <ScreenShell title="Fuel post" back onBack={() => navigation.goBack()}><Text>Post unavailable.</Text></ScreenShell>;
  const saved = savedPostIds.includes(post.id);
  const save = () => {
    toggleSavedPost(post.id);
    if (user?.uid) (saved ? removeSavedCommunityMeal(user.uid, post.id) : saveCommunityMeal(user.uid, post)).catch(() => undefined);
  };
  const copy = () => {
    if (!target) return Alert.alert("Set today’s workout first", "Once Strictly knows your target, it can adapt this meal to your needs.", [{ text: "Go to Home", onPress: () => navigation.navigate("Main", { screen: "Home" }) }]);
    importPostMeal(post);
    navigation.navigate("BuildMeal");
  };
  return <ScreenShell title="Pre-workout fuel" back onBack={() => navigation.goBack()}>
    {post.meal.imageUri ? <Image source={{ uri: post.meal.imageUri }} style={styles.photo} /> : <View style={styles.placeholder}><Text style={styles.emoji}>{post.meal.ingredients.slice(0, 5).map((item: any) => item.food.emoji).join("  ")}</Text></View>}
    <View style={styles.author}><View style={styles.avatar}><Text style={styles.avatarText}>{post.username[0].toUpperCase()}</Text></View><View><Text style={styles.username}>@{post.username}</Text><Text style={styles.context}>{post.workout.activityType} · {post.workout.durationMinutes} min · {post.workout.startsInMinutes} min before</Text></View></View>
    <Text style={styles.name}>{post.meal.name}</Text>
    {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
    {post.visibility.macros ? <View style={styles.fuel}><View style={styles.fuelTop}><View><Text style={styles.fuelLabel}>CARBOHYDRATES</Text><Text style={styles.carbs}>{Math.round(post.meal.macros.carbs)}g</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{post.meal.score.total}</Text><Text style={styles.scoreLabel}>STRICTLY SCORE</Text></View></View><CarbSpeedBar fast={post.meal.macros.fastCarbs} medium={post.meal.macros.mediumCarbs} slow={post.meal.macros.slowCarbs} /><View style={styles.macros}><Text style={styles.macro}>{Math.round(post.meal.macros.protein)}g protein</Text><Text style={styles.macro}>{Math.round(post.meal.macros.fat)}g fat</Text><Text style={styles.macro}>{Math.round(post.meal.macros.fiber)}g fiber</Text></View></View> : null}
    {post.visibility.ingredients ? <><Text style={styles.sectionTitle}>What’s in it</Text><View style={styles.ingredients}>{post.meal.ingredients.map((item: any) => <View key={item.id} style={styles.ingredient}><Text style={styles.ingredientName}>{item.food.emoji}  {item.food.name}</Text><Text style={styles.ingredientAmount}>{Math.round(item.grams)} g</Text></View>)}</View></> : null}
    <View style={styles.useful}><Text style={styles.usefulValue}>{post.saves + (saved ? 1 : 0)}</Text><Text style={styles.usefulLabel}>athletes saved this</Text><View style={styles.utilityDivider} /><Text style={styles.usefulValue}>{post.copies}</Text><Text style={styles.usefulLabel}>copied it</Text></View>
    <TouchableOpacity style={styles.copy} onPress={copy}><Ionicons name="copy-outline" size={18} color={strictlyColors.ink} /><Text style={styles.copyText}>Adapt to my {target?.carbTarget || "fuel"} g target</Text></TouchableOpacity>
    <TouchableOpacity style={styles.save} onPress={save}><Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={18} color={strictlyColors.ink} /><Text style={styles.saveText}>{saved ? "Saved to My Fuel" : "Save meal"}</Text></TouchableOpacity>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  photo: { width: "100%", height: 285, borderRadius: strictlyRadius.large },
  placeholder: { height: 190, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.large, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 34, letterSpacing: 8 },
  author: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 15 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: strictlyColors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.lime },
  username: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 12 },
  context: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, marginTop: 3, textTransform: "capitalize" },
  name: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 29, letterSpacing: -0.8, marginTop: 19 },
  caption: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 20, marginTop: 7 },
  fuel: { padding: 17, backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.large, marginTop: 16 },
  fuelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  fuelLabel: { fontFamily: strictlyType.mono, color: strictlyColors.sage, fontSize: 8, letterSpacing: 1 },
  carbs: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.white, fontSize: 35, marginTop: 2 },
  score: { width: 66, height: 66, borderRadius: 33, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 23, lineHeight: 25 },
  scoreLabel: { fontFamily: strictlyType.mono, color: strictlyColors.ink, fontSize: 5 },
  macros: { flexDirection: "row", gap: 8, marginTop: 13 },
  macro: { fontFamily: strictlyType.sans, color: "#C7D0C9", fontSize: 9 },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 18, marginTop: 23, marginBottom: 9 },
  ingredients: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, overflow: "hidden" },
  ingredient: { flexDirection: "row", justifyContent: "space-between", padding: 13, borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  ingredientName: { fontFamily: strictlyType.sansMedium, color: strictlyColors.ink, fontSize: 12 },
  ingredientAmount: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 9 },
  useful: { flexDirection: "row", alignItems: "baseline", gap: 5, padding: 15, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, marginTop: 13 },
  usefulValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink, fontSize: 16 },
  usefulLabel: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9 },
  utilityDivider: { width: 1, height: 20, backgroundColor: strictlyColors.borderStrong, marginHorizontal: 5 },
  copy: { height: 56, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, marginTop: 14 },
  copyText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.ink },
  save: { height: 50, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, marginTop: 8 },
  saveText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.ink, fontSize: 12 },
});

