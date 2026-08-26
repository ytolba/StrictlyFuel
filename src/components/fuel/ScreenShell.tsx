import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { strictlyColors, strictlyType } from "../../theme/strictlyTheme";

export function ScreenShell({ children, title, eyebrow, back, onBack, scroll = true }: { children: React.ReactNode; title?: string; eyebrow?: string; back?: boolean; onBack?: () => void; scroll?: boolean }) {
  const header = (title || back) ? <View style={styles.header}>
    {back ? <TouchableOpacity onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={20} color={strictlyColors.ink} /></TouchableOpacity> : null}
    <View style={styles.heading}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}{title ? <Text style={styles.title}>{title}</Text> : null}</View>
  </View> : null;
  const content = <>{header}{children}</>;
  return <SafeAreaView style={styles.safe} edges={["top"]}>{scroll ? <ScrollView style={styles.safe} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{content}</ScrollView> : <View style={[styles.safe, styles.content]}>{content}</View>}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: strictlyColors.background },
  content: { paddingHorizontal: 20, paddingBottom: 118 },
  header: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1 },
  eyebrow: { fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.5, color: strictlyColors.textSoft, textTransform: "uppercase", marginBottom: 4 },
  title: { fontFamily: strictlyType.sansMedium, fontWeight: "700", fontSize: 25, letterSpacing: -0.7, color: strictlyColors.ink },
});

