import React, { useRef, useState } from "react";
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import NativeShare, { Social } from "react-native-share";
import { captureRef } from "react-native-view-shot";
import { useFuel } from "../../contexts/FuelContext";
import { useAuth } from "../../contexts/AuthContext";
import { publishFuelPost } from "../../services/fuelService";
import type { FuelPost, PostVisibility } from "../../types/fuel";
import { ScreenShell } from "../../components/fuel/ScreenShell";
import { LoadingState } from "../../components/fuel/LoadingState";
import { StrictlyFuelShareCard } from "../../components/fuel/StrictlyFuelShareCard";
import { makeUuid } from "../../utils/ids";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type ShareDestination = "messages" | "save" | "more";

const shareActions: Array<{ id: ShareDestination; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
  { id: "messages", label: "Messages", icon: "chatbubble-ellipses" },
  { id: "save", label: "Save", icon: "download-outline" },
  { id: "more", label: "More", icon: "share-outline" },
];

const didCancel = (error: unknown) => {
  const text = String((error as { message?: string })?.message || error || "").toLowerCase();
  return text.includes("cancel") || text.includes("dismiss") || text.includes("user did not share");
};

export default function ShareFuelScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { meals, workout, target, addLocalPost } = useFuel();
  const meal = meals.find((item) => item.id === route.params?.mealId) || meals[0];
  const cardRef = useRef<View | null>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>({ workout: true, macros: true, ingredients: true });
  const [publishing, setPublishing] = useState(false);
  const [sharingTo, setSharingTo] = useState<ShareDestination | null>(null);
  const [photoReady, setPhotoReady] = useState(!meal?.imageUri);

  if (!meal || !workout || !target) {
    return <ScreenShell title="Share fuel" back onBack={() => navigation.goBack()}><Text style={styles.missing}>Meal unavailable.</Text></ScreenShell>;
  }

  const captureCard = async () => {
    if (meal.imageUri && !photoReady) throw new Error("Your meal photo is still loading. Try again in a second.");
    if (!cardRef.current) throw new Error("The fuel card is not ready yet.");
    await new Promise((resolve) => setTimeout(resolve, 80));
    return captureRef(cardRef, { format: "png", quality: 1, width: 1080, height: 1920, result: "tmpfile" });
  };

  const openShareSheet = (uri: string, title = "Share your StrictlyFuel card") => NativeShare.open({
    url: uri,
    type: "image/png",
    filename: `strictlyfuel-${meal.id}.png`,
    title,
    message: `${Math.round(meal.macros.carbs)}g carbs for my ${workout.durationMinutes}-minute workout · StrictlyFuel`,
    failOnCancel: false,
  });

  const shareCard = async (destination: ShareDestination) => {
    if (sharingTo) return;
    setSharingTo(destination);
    try {
      const uri = await captureCard();
      if (destination === "save") {
        const permission = await MediaLibrary.requestPermissionsAsync(true);
        if (!permission.granted) {
          return Alert.alert("Photos access needed", "Allow StrictlyFuel to add photos so this card can be saved to your camera roll.");
        }
        await MediaLibrary.saveToLibraryAsync(uri);
        return Alert.alert("Saved", "Your fuel card is ready in Photos.");
      }

      if (destination === "messages") {
        await NativeShare.shareSingle({ social: Social.Sms, url: uri, type: "image/png", message: "My workout fuel on StrictlyFuel" });
      } else {
        await openShareSheet(uri);
      }
    } catch (error) {
      if (didCancel(error)) return;
      const message = (error as { message?: string })?.message || "That app could not receive the card.";
      Alert.alert("Could not share directly", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use share sheet",
          onPress: async () => {
            try {
              const uri = await captureCard();
              await openShareSheet(uri);
            } catch (fallbackError) {
              if (!didCancel(fallbackError)) Alert.alert("Could not share", (fallbackError as { message?: string })?.message || "Try again in a moment.");
            }
          },
        },
      ]);
    } finally {
      setSharingTo(null);
    }
  };

  const publish = async () => {
    if (!user?.uid) return Alert.alert("Account required", "Sign in before sharing a meal publicly.");
    if (user.isGuest) return Alert.alert("Create an account", "Community posts are tied to an account. Create one to share your fuel.");

    const username =
      (user.firstName || user.email?.split("@")[0] || "athlete").toLowerCase().replace(/[^a-z0-9._]/g, "") || "athlete";
    const post: FuelPost = {
      id: makeUuid(), userId: user.uid, username, meal, workout, target,
      caption: caption.trim(), visibility, saves: 0, copies: 0, likes: 0,
      createdAt: new Date().toISOString(),
    };
    setPublishing(true);
    try {
      await publishFuelPost(user.uid, post, target);
      addLocalPost(post);
      Alert.alert("Fuel shared", "Your meal is now available to athletes looking for similar workout fuel.", [
        { text: "View post", onPress: () => navigation.navigate("Main", { screen: "Discover" }) },
      ]);
    } catch (error: any) {
      Alert.alert("Could not publish", error?.message || "Try again in a moment.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ScreenShell title="Share your fuel" eyebrow="MAKE IT YOURS" back onBack={() => navigation.goBack()}>
      <Text style={styles.intro}>A clean, story-sized card made from your photo and workout numbers.</Text>
      <View style={styles.cardStage}>
        <View ref={cardRef} collapsable={false} style={styles.cardCapture}>
          <StrictlyFuelShareCard meal={meal} workout={workout} onPhotoLoadEnd={() => setPhotoReady(true)} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Share your card</Text>
      <View style={styles.shareGrid}>
        {shareActions.map((action) => {
          const active = sharingTo === action.id;
          return (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.72}
              disabled={sharingTo !== null}
              style={[styles.shareAction, action.id === "save" && styles.saveAction, sharingTo && !active && styles.actionDim]}
              onPress={() => shareCard(action.id)}
            >
              {active ? <LoadingState compact /> : <Ionicons name={action.icon} size={21} color={action.id === "save" ? strictlyColors.onLime : strictlyColors.text} />}
              <Text style={[styles.shareActionLabel, action.id === "save" && styles.saveActionLabel]}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.shareHint}>Save it, send it in Messages, or use More to choose any installed app. Every export is a high-resolution 9:16 image.</Text>

      <View style={styles.communityHeading}>
        <View style={styles.communityIcon}><Ionicons name="people-outline" size={17} color={strictlyColors.accentText} /></View>
        <View style={styles.communityCopy}>
          <Text style={styles.sectionTitleInline}>Share inside StrictlyFuel</Text>
          <Text style={styles.communityDetail}>Optional. Your meal stays private until you publish it.</Text>
        </View>
      </View>
      <TextInput
        multiline
        maxLength={240}
        value={caption}
        onChangeText={setCaption}
        placeholder="What made this meal work for today’s session?"
        placeholderTextColor={strictlyColors.textSoft}
        style={styles.caption}
      />
      <Text style={styles.controlEyebrow}>WHAT APPEARS ON YOUR COMMUNITY POST</Text>
      <View style={styles.controls}>
        {([
          ["workout", "Workout context", "Activity, duration, intensity, and timing"],
          ["macros", "Nutrition", "Calories, macros, and carb composition"],
          ["ingredients", "Meal ingredients", "Foods and serving quantities"],
        ] as [keyof PostVisibility, string, string][]).map(([key, label, detail]) => (
          <View key={key} style={styles.control}>
            <View style={styles.controlCopy}><Text style={styles.controlTitle}>{label}</Text><Text style={styles.controlText}>{detail}</Text></View>
            <Switch value={visibility[key]} onValueChange={(value) => setVisibility((current) => ({ ...current, [key]: value }))} trackColor={{ false: strictlyColors.borderStrong, true: strictlyColors.sage }} thumbColor={visibility[key] ? strictlyColors.lime : strictlyColors.white} />
          </View>
        ))}
      </View>
      <View style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={18} color={strictlyColors.text} />
        <Text style={styles.privacyText}>Publishing creates a separate post you can delete later. Precise location is never attached.</Text>
      </View>
      <TouchableOpacity activeOpacity={0.78} disabled={publishing} style={[styles.publish, publishing && styles.disabled]} onPress={publish}>
        {publishing ? <LoadingState compact title="Publishing your fuel" /> : <><Ionicons name="paper-plane-outline" size={18} color={strictlyColors.onLime} /><Text style={styles.publishText}>Publish to community</Text></>}
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  missing: { color: strictlyColors.text },
  intro: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 13, lineHeight: 19, marginTop: -4, marginBottom: 15 },
  cardStage: { alignItems: "center", paddingVertical: 10, borderRadius: strictlyRadius.xlarge, backgroundColor: strictlyColors.surfaceMuted, borderWidth: 1, borderColor: strictlyColors.border, overflow: "hidden" },
  cardCapture: { width: 320, height: 568, borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  sectionTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 16, marginTop: 23, marginBottom: 10 },
  shareGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  shareAction: { flex: 1, minWidth: 92, height: 72, paddingHorizontal: 8, borderRadius: strictlyRadius.medium, alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  saveAction: { backgroundColor: strictlyColors.lime, borderColor: strictlyColors.lime },
  shareActionLabel: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 11 },
  saveActionLabel: { color: strictlyColors.onLime },
  actionDim: { opacity: 0.5 },
  shareHint: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, lineHeight: 14, marginTop: 9 },
  communityHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 28, marginBottom: 11 },
  communityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surfaceMuted },
  communityCopy: { flex: 1 },
  sectionTitleInline: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 16 },
  communityDetail: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, marginTop: 2 },
  caption: { minHeight: 94, textAlignVertical: "top", padding: 14, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 13, lineHeight: 19 },
  controlEyebrow: { fontFamily: strictlyType.semibold, color: strictlyColors.textSoft, fontSize: 11, letterSpacing: 1.1, marginTop: 18, marginBottom: 8 },
  controls: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, overflow: "hidden" },
  control: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  controlCopy: { flex: 1 },
  controlTitle: { fontFamily: strictlyType.bold,  color: strictlyColors.text, fontSize: 12 },
  controlText: { fontFamily: strictlyType.regular, color: strictlyColors.textSoft, fontSize: 11, marginTop: 3 },
  privacy: { flexDirection: "row", gap: 9, padding: 14, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium, marginTop: 13 },
  privacyText: { flex: 1, fontFamily: strictlyType.regular, color: strictlyColors.text, fontSize: 11, lineHeight: 15 },
  publish: { height: 56, backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.medium, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 14 },
  publishText: { fontFamily: strictlyType.bold,  color: strictlyColors.onLime },
  disabled: { opacity: 0.45 },
});
