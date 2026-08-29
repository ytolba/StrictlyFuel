import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COMMUNITY_SEED } from "../../data/communitySeed";
import { useFuel } from "../../contexts/FuelContext";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { FuelPostCard } from "../../components/fuel/FuelPostCard";
import { strictlyColors, strictlyType } from "../../theme/strictlyTheme";

export default function SavedMealsScreen({ navigation }: any) {
  const { localPosts, savedPostIds, toggleSavedPost, importPostMeal, target } = useFuel();
  const saved = [...localPosts, ...COMMUNITY_SEED].filter((post) => savedPostIds.includes(post.id));
  return <ScreenShell title="Saved meals" eyebrow="READY TO REUSE" back onBack={() => navigation.goBack()}>
    {saved.map((post) => <FuelPostCard key={post.id} post={post} saved onPress={() => navigation.navigate("FuelPostDetail", { post })} onSave={() => toggleSavedPost(post.id)} onCopy={() => { if (!target) return; importPostMeal(post); navigation.navigate("BuildMeal"); }} />)}
    {!saved.length ? <View style={styles.empty}><Text style={styles.title}>Nothing saved yet</Text><Text style={styles.text}>Bookmark a useful community meal and it will stay organized here.</Text></View> : null}
  </ScreenShell>;
}

const styles = StyleSheet.create({ empty: { padding: 30, alignItems: "center" }, title: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.text, fontSize: 17 }, text: { fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 6 } });

