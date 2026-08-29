import React, { useState } from "react";
import { Alert, Image, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { publishFuelPost } from "../../services/fuelService";
import type { FuelPost, PostVisibility } from "../../types/fuel";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { CarbSpeedBar } from "../../components/fuel/CarbSpeedBar";
import { LoadingState } from "../../components/fuel/LoadingState";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export default function ShareFuelScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { meals, workout, target, addLocalPost } = useFuel();
  const meal = meals.find((item) => item.id === route.params?.mealId) || meals[0];
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>({ workout: true, macros: true, ingredients: true });
  const [publishing, setPublishing] = useState(false);
  if (!meal || !workout || !target) return <ScreenShell title="Share fuel" back onBack={() => navigation.goBack()}><Text>Meal unavailable.</Text></ScreenShell>;

  const publish = async () => {
    if (!user?.uid) return Alert.alert("Account required", "Sign in before sharing a meal publicly.");
    const username = (user.firstName || user.email.split("@")[0] || "athlete").toLowerCase().replace(/[^a-z0-9._]/g, "");
    const post: FuelPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: user.uid,
      username,
      meal,
      workout,
      target,
      caption: caption.trim(),
      visibility,
      saves: 0,
      copies: 0,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    setPublishing(true);
    try {
      await publishFuelPost(post);
      addLocalPost(post);
      Alert.alert("Fuel shared", "Your meal is now available to athletes looking for similar workout fuel.", [{ text: "View post", onPress: () => navigation.navigate("Main", { screen: "Discover" }) }]);
    } catch (error: any) { Alert.alert("Could not publish", error?.message || "Try again in a moment."); }
    finally { setPublishing(false); }
  };

  return <ScreenShell title="Share your fuel" eyebrow="PRIVATE UNTIL YOU PUBLISH" back onBack={() => navigation.goBack()}>
    <View style={styles.preview}>
      {meal.imageUri ? <Image source={{ uri: meal.imageUri }} style={styles.photo} /> : <View style={styles.placeholder}><Text style={styles.emoji}>{meal.ingredients.slice(0, 4).map((item) => item.food.emoji).join("  ")}</Text></View>}
      <View style={styles.previewBody}><Text style={styles.workout}>{workout.activityType} · {workout.durationMinutes} min</Text><Text style={styles.name}>{meal.name}</Text><View style={styles.scoreRow}><Text style={styles.carbs}>{Math.round(meal.macros.carbs)}g <Text style={styles.carbsUnit}>carbs</Text></Text><View style={styles.score}><Text style={styles.scoreValue}>{meal.score.total}</Text><Text style={styles.scoreLabel}>SCORE</Text></View></View><CarbSpeedBar compact fast={meal.macros.fastCarbs} medium={meal.macros.mediumCarbs} slow={meal.macros.slowCarbs} /></View>
    </View>
    <Text style={styles.sectionTitle}>Add a caption</Text>
    <TextInput multiline maxLength={240} value={caption} onChangeText={setCaption} placeholder="What made this meal work for today’s session?" placeholderTextColor={strictlyColors.textSoft} style={styles.caption} />
    <Text style={styles.sectionTitle}>Choose what appears</Text>
    <View style={styles.controls}>{([
      ["workout", "Workout context", "Activity, duration, intensity, and timing"],
      ["macros", "Nutrition", "Calories, macros, and carb composition"],
      ["ingredients", "Meal ingredients", "Foods and serving quantities"],
    ] as [keyof PostVisibility, string, string][]).map(([key, label, detail]) => <View key={key} style={styles.control}><View style={styles.controlCopy}><Text style={styles.controlTitle}>{label}</Text><Text style={styles.controlText}>{detail}</Text></View><Switch value={visibility[key]} onValueChange={(value) => setVisibility((current) => ({ ...current, [key]: value }))} trackColor={{ false: strictlyColors.borderStrong, true: strictlyColors.sage }} thumbColor={visibility[key] ? strictlyColors.lime : strictlyColors.white} /></View>)}</View>
    <View style={styles.privacy}><Ionicons name="lock-closed-outline" size={18} color={strictlyColors.text} /><Text style={styles.privacyText}>Your meal log remains private. Publishing creates a separate community post that you can delete later. Precise location is never attached.</Text></View>
    <TouchableOpacity activeOpacity={0.78} disabled={publishing} style={[styles.publish, publishing && styles.disabled]} onPress={publish}>{publishing ? <LoadingState compact title="Publishing your fuel" /> : <><Ionicons name="paper-plane-outline" size={18} color={strictlyColors.onLime} /><Text style={styles.publishText}>Publish to community</Text></>}</TouchableOpacity>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  preview: { overflow: "hidden", backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large },
  photo: { width: "100%", height: 200 },
  placeholder: { height: 145, backgroundColor: strictlyColors.cream, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 30, letterSpacing: 6 },
  previewBody: { padding: 16 },
  workout: { fontFamily: strictlyType.mono, color: strictlyColors.textSoft, fontSize: 8, textTransform: "uppercase", letterSpacing: 1 },
  name: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 21, marginTop: 7 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7, marginBottom: 10 },
  carbs: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 28 },
  carbsUnit: { fontFamily: strictlyType.sans, fontWeight: "400", color: strictlyColors.textSoft, fontSize: 10 },
  score: { width: 43, height: 43, borderRadius: 22, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 15, lineHeight: 16 },
  scoreLabel: { fontFamily: strictlyType.mono, color: strictlyColors.onLime, fontSize: 5 },
  sectionTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 16, marginTop: 22, marginBottom: 9 },
  caption: { minHeight: 94, textAlignVertical: "top", padding: 14, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 13, lineHeight: 19 },
  controls: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, overflow: "hidden" },
  control: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  controlCopy: { flex: 1 },
  controlTitle: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 },
  controlText: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, marginTop: 3 },
  privacy: { flexDirection: "row", gap: 9, padding: 14, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, marginTop: 13 },
  privacyText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 10, lineHeight: 15 },
  publish: { height: 56, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 14 },
  publishText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime },
  disabled: { opacity: 0.45 },
});
