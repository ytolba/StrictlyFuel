import React, { useEffect, useRef } from "react";
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { strictlyColors, strictlyLayout, strictlyType } from "../../theme/strictlyTheme";

export function ScreenShell({ children, title, eyebrow, back, onBack, action, scroll = true }: { children: React.ReactNode; title?: string; eyebrow?: string; back?: boolean; onBack?: () => void; /** Optional trailing control in the header, e.g. a close or done button. */ action?: React.ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  // Clear the floating tab bar, whatever the device reports for its bottom inset.
  const bottomPad = strictlyLayout.tabBarHeight + Math.max(insets.bottom, strictlyLayout.tabBarMargin) + 20;
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrance]);
  const header = (title || back || action) ? <View style={styles.header}>
    {back ? <TouchableOpacity activeOpacity={0.68} hitSlop={8} onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={20} color={strictlyColors.text} /></TouchableOpacity> : null}
    <View style={styles.heading}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}{title ? <Text style={styles.title}>{title}</Text> : null}</View>
    {action ?? null}
  </View> : null;
  const content = <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }] }}>{header}{children}</Animated.View>;
  return <SafeAreaView style={styles.safe} edges={["top"]}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>{scroll ? <ScrollView style={styles.safe} contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>{content}</ScrollView> : <View style={[styles.safe, styles.content, { paddingBottom: bottomPad }]}>{content}</View>}</KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: strictlyColors.background },
  content: { paddingHorizontal: 20 },
  header: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1 },
  eyebrow: { fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.5, color: strictlyColors.textSoft, textTransform: "uppercase", marginBottom: 4 },
  title: { fontFamily: strictlyType.sansMedium, fontWeight: "700", fontSize: 25, letterSpacing: -0.7, color: strictlyColors.text },
});
