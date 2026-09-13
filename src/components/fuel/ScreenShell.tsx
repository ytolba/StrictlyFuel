import React, { useEffect, useRef } from "react";
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { strictlyColors, strictlyType } from "../../theme/strictlyTheme";

export function ScreenShell({ children, title, eyebrow, back, onBack, action, scroll = true, scrollRef }: { children: React.ReactNode; title?: string; eyebrow?: string; back?: boolean; onBack?: () => void; /** Optional trailing control in the header, e.g. a close or done button. */ action?: React.ReactNode; scroll?: boolean; /** Lets a screen drive its own scrolling, e.g. to reveal a result in place. */ scrollRef?: React.RefObject<ScrollView | null> }) {
  // The tab bar is docked, so the navigator already reserves its height and the
  // home-indicator inset. All the content needs is breathing room at the end.
  const bottomPad = 28;
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrance]);
  const header = (title || back || action) ? <View style={styles.header}>
    {back ? <TouchableOpacity activeOpacity={0.68} hitSlop={8} onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={20} color={strictlyColors.text} /></TouchableOpacity> : null}
    {/* `eyebrow` is accepted for existing callers but no longer drawn: the title carries the screen. */}
    <View style={styles.heading}>{title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}</View>
    {action ?? null}
  </View> : null;
  const content = <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }] }}>{header}{children}</Animated.View>;
  return <SafeAreaView style={styles.safe} edges={["top"]}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>{scroll ? <ScrollView ref={scrollRef} style={styles.safe} contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>{content}</ScrollView> : <View style={[styles.safe, styles.content, { paddingBottom: bottomPad }]}>{content}</View>}</KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: strictlyColors.background },
  content: { paddingHorizontal: 20 },
  header: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1 },
  title: { fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: strictlyColors.text },
});
