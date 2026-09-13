import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { StrictlyMark } from "../components/StrictlyBrand";
import { NutritionProfileForm } from "../components/NutritionProfileForm";
import { AthleteBasicsForm } from "../components/AthleteBasicsForm";
import { saveNutritionProfile } from "../services/nutritionProfileService";
import { EMPTY_NUTRITION_PROFILE, NutritionProfile } from "../types/nutritionProfile";
import { appleHealthSupported, connectAppleHealth } from "../services/appleHealthService";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type OnboardingStackParamList = { Onboarding: undefined; Auth: undefined };
type OnboardingNavigation = StackNavigationProp<OnboardingStackParamList, "Onboarding">;

const TOTAL_STEPS = 7;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingNavigation>();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);
  const [healthConnecting, setHealthConnecting] = useState(false);

  const finish = async () => {
    await saveNutritionProfile(profile);
    await AsyncStorage.setItem("onboardingSeen", "true");
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  };

  const next = () => {
    if (step === 1 && !profile.bodyWeightKg) {
      Alert.alert("Add your body weight", "Weight is required because it directly determines your workout carbohydrate target.");
      return;
    }
    return step === TOTAL_STEPS - 1 ? finish() : setStep((current) => current + 1);
  };

  const continueThroughHealthPermission = async () => {
    if (!appleHealthSupported()) {
      await finish();
      return;
    }

    setHealthConnecting(true);
    try {
      const requestCompleted = await connectAppleHealth();
      if (!requestCompleted) {
        Alert.alert("Apple Health couldn’t open", "Please try again so you can choose what to share in Apple’s permission screen.");
        return;
      }
      await finish();
    } catch (error) {
      Alert.alert("Apple Health couldn’t open", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setHealthConnecting(false);
    }
  };

  const renderIntro = () => (
    <View style={styles.intro}>
      <View style={styles.markWrap}><StrictlyMark size={44} /></View>
      <Text style={styles.hero}>Meals built for the workout ahead.</Text>
      <Text style={styles.heroDescription}>
        Strictly turns a workout into a carb target, then helps you build, scan, and adjust a meal that actually fits the timing.
      </Text>
      <View style={styles.metricPreview}>
        {[
          ["01", "Set the workout", "Sport, duration, intensity, and start time."],
          ["02", "See the fuel", "A carb target you can understand on a plate."],
          ["03", "Make it yours", "Timing, sensitivities, digestion, and preferences."],
        ].map(([number, title, copy], index) => (
          <View key={number} style={[styles.previewRow, index === 2 && styles.previewRowLast]}>
            <Text style={styles.previewNumber}>{number}</Text>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>{title}</Text>
              <Text style={styles.previewDescription}>{copy}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={strictlyColors.textSoft} />
          </View>
        ))}
      </View>
      <View style={styles.exampleCard}>
        <Text style={styles.exampleScore}>82g</Text>
        <View style={styles.exampleCopy}>
          <Text style={styles.exampleLabel}>Then see what 82 grams looks like</Text>
          <Text style={styles.exampleText}>Build a meal, scan your plate, or borrow an idea from an athlete fueling similar work.</Text>
        </View>
      </View>
    </View>
  );

  const renderProfileStep = () => {
    if (step === 6) {
      const supported = appleHealthSupported();
      return <View style={styles.healthStep}>
        <View style={styles.healthIcon}><Ionicons name="heart" size={29} color={strictlyColors.white} /></View>
        <Text style={styles.healthTitle}>Let your training lead the plan.</Text>
        <Text style={styles.healthOptional}>Optional · Apple Health</Text>
        <Text style={styles.healthDescription}>Connect completed workouts to see duration, distance, energy, and heart-rate context. Your private Post Workout tab can then build recovery guidance from what you actually did.</Text>
        <View style={styles.healthList}>
          {["Automatic workout context", "Recovery meals after completed sessions", "Read-only access. Your Health data stays on your phone"].map((copy) => <View key={copy} style={styles.healthRow}><Ionicons name="checkmark" size={15} color={strictlyColors.good} /><Text style={styles.healthRowText}>{copy}</Text></View>)}
        </View>
        {supported ? <View style={styles.healthPermissionNote}><Ionicons name="shield-checkmark-outline" size={17} color={strictlyColors.good} /><Text style={styles.healthPermissionNoteText}>Continue to Apple’s permission screen, where you choose exactly what to share.</Text></View> : <View style={styles.healthUnavailable}><Text style={styles.healthUnavailableTitle}>Available on iPhone and supported iPad builds</Text><Text style={styles.healthUnavailableText}>Continue setup now. You can manage Apple Health later from Account on a supported Apple device.</Text></View>}
      </View>;
    }
    if (step === 1) return <AthleteBasicsForm profile={profile} onChange={setProfile} />;
    const sections = step === 2 ? ["sensitivities"] : step === 3 ? ["conditions"] : step === 4 ? ["dietaryPatterns"] : ["priorities"];
    return (
      <View>
        <NutritionProfileForm
          profile={profile}
          onChange={setProfile}
          sections={sections as ("sensitivities" | "conditions" | "dietaryPatterns" | "priorities")[]}
        />
        <View style={styles.privacyCard}>
          <Ionicons name="lock-closed-outline" size={17} color={strictlyColors.good} />
          <Text style={styles.privacyText}>Your profile is optional and stored on this device. You can update it from Account.</Text>
        </View>
        {step === 3 && (
          <Text style={styles.medicalNote}>
            Strictly uses this context to filter and explain workout-fuel ideas. It does not diagnose conditions or determine whether a meal is medically safe.
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.iconButton, step === 0 && styles.iconButtonHidden]}
          onPress={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
        >
          <Ionicons name="arrow-back" size={19} color={strictlyColors.text} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={styles.stepCount}>{String(step + 1).padStart(2, "0")}/{String(TOTAL_STEPS).padStart(2, "0")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
        {step === 0 ? renderIntro() : renderProfileStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && step !== TOTAL_STEPS - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={next}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.nextButton, healthConnecting && styles.nextButtonDisabled]} disabled={healthConnecting} onPress={step === TOTAL_STEPS - 1 ? continueThroughHealthPermission : next}>
          <Text style={styles.nextText}>{healthConnecting && step === TOTAL_STEPS - 1 ? "Opening Apple Health…" : step === TOTAL_STEPS - 1 ? "Continue" : step === 0 ? "Build my fuel profile" : "Continue"}</Text>
          <Ionicons name="arrow-forward" size={17} color={strictlyColors.onLime} />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: strictlyColors.background },
  flex: { flex: 1 },
  topBar: { height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 12 },
  iconButton: { width: 36, height: 36, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.small, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surface },
  iconButtonHidden: { opacity: 0 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: strictlyColors.border, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: strictlyColors.lime },
  stepCount: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 11 },
  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 40 },
  intro: { paddingTop: 4 },
  // The mark now fills with `text`, so the chip behind it has to be a surface,
  // not `ink` — an ink mark on an ink chip was invisible.
  markWrap: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, marginBottom: 30 },
  hero: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 34, lineHeight: 39, letterSpacing: -1.1 },
  heroDescription: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 15, lineHeight: 22, marginTop: 10 },
  metricPreview: { marginTop: 27, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, paddingHorizontal: 16 },
  previewRow: { minHeight: 72, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  previewRowLast: { borderBottomWidth: 0 },
  previewNumber: { width: 30, color: strictlyColors.good, fontFamily: strictlyType.mono, fontSize: 11 },
  previewCopy: { flex: 1 },
  previewTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 14 },
  previewDescription: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, marginTop: 3 },
  exampleCard: { flexDirection: "row", alignItems: "center", backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.large, padding: 17, marginTop: 12 },
  exampleScore: { color: strictlyColors.lime, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 36, letterSpacing: -1.3, width: 62 },
  exampleCopy: { flex: 1 },
  exampleLabel: { color: strictlyColors.white, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 15 },
  exampleText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 15, marginTop: 3 },
  privacyCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.cream },
  privacyText: { flex: 1, color: strictlyColors.text, fontFamily: strictlyType.sans, fontSize: 12, lineHeight: 17 },
  medicalNote: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 16, marginTop: 11 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: strictlyColors.border, backgroundColor: strictlyColors.background },
  skipButton: { height: 48, justifyContent: "center", paddingHorizontal: 12 },
  skipText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sansMedium, fontSize: 13 },
  nextButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.lime },
  nextButtonDisabled: { opacity: 0.62 },
  nextText: { color: strictlyColors.onLime, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 15 },
  healthStep: { paddingTop: 6, paddingBottom: 12 },
  healthIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#E64A55", marginBottom: 18 },
  healthTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 28, lineHeight: 33, letterSpacing: -0.8, maxWidth: 330 },
  healthOptional: { color: strictlyColors.textSoft, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 13, marginTop: 6 },
  healthDescription: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 13, lineHeight: 19, marginTop: 9 },
  healthList: { gap: 9, padding: 14, marginTop: 17, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border },
  healthRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  healthRowText: { flex: 1, color: strictlyColors.text, fontFamily: strictlyType.sans, fontSize: 12, lineHeight: 17 },
  healthPermissionNote: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 14, marginTop: 13, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream },
  healthPermissionNoteText: { flex: 1, color: strictlyColors.text, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 17 },
  healthUnavailable: { padding: 16, marginTop: 13, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream },
  healthUnavailableTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "700", fontSize: 13 },
  healthUnavailableText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 16, marginTop: 5 },
});

export default OnboardingScreen;
