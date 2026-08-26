import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { StrictlyMark } from "../components/StrictlyBrand";
import { NutritionProfileForm } from "../components/NutritionProfileForm";
import { saveNutritionProfile } from "../services/nutritionProfileService";
import { EMPTY_NUTRITION_PROFILE, NutritionProfile } from "../types/nutritionProfile";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type OnboardingStackParamList = { Onboarding: undefined; Auth: undefined };
type OnboardingNavigation = StackNavigationProp<OnboardingStackParamList, "Onboarding">;

const TOTAL_STEPS = 4;

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingNavigation>();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);

  const finish = async () => {
    await saveNutritionProfile(profile);
    await AsyncStorage.setItem("onboardingSeen", "true");
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  };

  const next = () => (step === TOTAL_STEPS - 1 ? finish() : setStep((current) => current + 1));

  const renderIntro = () => (
    <View style={styles.intro}>
      <View style={styles.markWrap}><StrictlyMark size={66} dark={false} /></View>
      <Text style={styles.kicker}>PERSONALIZED INGREDIENT INTELLIGENCE</Text>
      <Text style={styles.hero}>One score. Three clear signals.</Text>
      <Text style={styles.heroDescription}>
        Strictly scores every product on what it contains, how heavily it’s processed, and how well it fits you.
      </Text>
      <View style={styles.metricPreview}>
        {[
          ["01", "Ingredient quality", "What’s present—and what isn’t."],
          ["02", "Level of processing", "Whole ingredients to heavy formulation."],
          ["03", "Fit for you", "Your sensitivities, values, and priorities."],
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
        <Text style={styles.exampleScore}>74</Text>
        <View style={styles.exampleCopy}>
          <Text style={styles.exampleLabel}>Not a fit for you</Text>
          <Text style={styles.exampleText}>A product can score well overall and still conflict with something you avoid.</Text>
        </View>
      </View>
    </View>
  );

  const renderProfileStep = () => {
    const sections = step === 1 ? ["sensitivities"] : step === 2 ? ["conditions"] : ["dietaryPatterns", "priorities"];
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
        {step === 2 && (
          <Text style={styles.medicalNote}>
            Strictly personalizes ingredient context; it does not diagnose conditions or determine whether a food is medically safe.
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 0 ? renderIntro() : renderProfileStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.skipButton} onPress={next}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={next}>
          <Text style={styles.nextText}>{step === TOTAL_STEPS - 1 ? "Save profile" : step === 0 ? "Personalize my score" : "Continue"}</Text>
          <Ionicons name="arrow-forward" size={17} color={strictlyColors.paper} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: strictlyColors.background },
  topBar: { height: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 12 },
  iconButton: { width: 36, height: 36, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.small, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.surface },
  iconButtonHidden: { opacity: 0 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: strictlyColors.border, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: strictlyColors.ink },
  stepCount: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 10 },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 26 },
  intro: { paddingTop: 4 },
  markWrap: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.ink, marginBottom: 30 },
  kicker: { color: strictlyColors.good, fontFamily: strictlyType.mono, fontSize: 9, lineHeight: 14, letterSpacing: 1.1 },
  hero: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 34, lineHeight: 38, letterSpacing: -1.2, marginTop: 9 },
  heroDescription: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 15, lineHeight: 22, marginTop: 10 },
  metricPreview: { marginTop: 27, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, paddingHorizontal: 16 },
  previewRow: { minHeight: 72, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  previewRowLast: { borderBottomWidth: 0 },
  previewNumber: { width: 30, color: strictlyColors.good, fontFamily: strictlyType.mono, fontSize: 10 },
  previewCopy: { flex: 1 },
  previewTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 14 },
  previewDescription: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, marginTop: 3 },
  exampleCard: { flexDirection: "row", alignItems: "center", backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.large, padding: 17, marginTop: 12 },
  exampleScore: { color: strictlyColors.lime, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 36, letterSpacing: -1.3, width: 62 },
  exampleCopy: { flex: 1 },
  exampleLabel: { color: strictlyColors.white, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 15 },
  exampleText: { color: "#B8C3BC", fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 15, marginTop: 3 },
  privacyCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.cream },
  privacyText: { flex: 1, color: strictlyColors.ink, fontFamily: strictlyType.sans, fontSize: 12, lineHeight: 17 },
  medicalNote: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 16, marginTop: 11 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: strictlyColors.border, backgroundColor: strictlyColors.background },
  skipButton: { height: 48, justifyContent: "center", paddingHorizontal: 12 },
  skipText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sansMedium, fontSize: 13 },
  nextButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, borderRadius: strictlyRadius.small, backgroundColor: strictlyColors.ink },
  nextText: { color: strictlyColors.paper, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 13 },
});

export default OnboardingScreen;
