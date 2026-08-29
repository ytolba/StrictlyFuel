import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CONDITION_OPTIONS,
  DIETARY_PATTERN_OPTIONS,
  NutritionProfile,
  PRIORITY_OPTIONS,
  ProfileOption,
  SENSITIVITY_OPTIONS,
} from "../types/nutritionProfile";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type ProfileKey = "sensitivities" | "conditions" | "dietaryPatterns" | "priorities";

type Props = {
  profile: NutritionProfile;
  onChange: (profile: NutritionProfile) => void;
  sections?: ProfileKey[];
};

const sectionContent: Record<ProfileKey, { eyebrow: string; title: string; description: string; options: ProfileOption[] }> = {
  sensitivities: {
    eyebrow: "SENSITIVITIES",
    title: "What doesn’t sit well?",
    description: "Choose allergies, intolerances, or foods that tend to feel rough around training. This is optional.",
    options: SENSITIVITY_OPTIONS,
  },
  conditions: {
    eyebrow: "DIET-RELATED CONDITIONS",
    title: "Anything that shapes your fuel choices?",
    description: "These selections help flag meal ideas that may not fit you. They do not replace medical guidance.",
    options: CONDITION_OPTIONS,
  },
  dietaryPatterns: {
    eyebrow: "VALUES",
    title: "How do you prefer to eat?",
    description: "We’ll keep meal ideas aligned with the way you prefer to eat.",
    options: DIETARY_PATTERN_OPTIONS,
  },
  priorities: {
    eyebrow: "PRIORITIES",
    title: "What matters most?",
    description: "Tell us what makes a pre-workout meal practical for your life and stomach.",
    options: PRIORITY_OPTIONS,
  },
};

export const NutritionProfileForm = ({ profile, onChange, sections = ["sensitivities", "conditions", "dietaryPatterns", "priorities"] }: Props) => {
  const toggle = (key: ProfileKey, id: string) => {
    const selected = profile[key];
    onChange({
      ...profile,
      [key]: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    });
  };

  return (
    <View>
      {sections.map((key) => {
        const section = sectionContent[key];
        return (
          <View key={key} style={styles.section}>
            <Text style={styles.eyebrow}>{section.eyebrow}</Text>
            <Text style={styles.title}>{section.title}</Text>
            <Text style={styles.description}>{section.description}</Text>
            <View style={styles.chipGrid}>
              {section.options.map((option) => {
                const selected = profile[key].includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggle(key, option.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    {selected && <Ionicons name="checkmark" size={14} color={strictlyColors.paper} />}
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  eyebrow: { color: strictlyColors.good, fontFamily: strictlyType.mono, fontSize: 10, letterSpacing: 1.1, marginBottom: 8 },
  title: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 22, letterSpacing: -0.5 },
  description: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 16 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { minHeight: 39, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, borderWidth: 1, borderColor: strictlyColors.borderStrong, borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.surface },
  chipSelected: { backgroundColor: strictlyColors.ink, borderColor: strictlyColors.ink },
  chipText: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "500", fontSize: 13 },
  chipTextSelected: { color: strictlyColors.paper },
});
