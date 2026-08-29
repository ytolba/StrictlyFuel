import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

type Props = {
  title?: string;
  messages?: string[];
  compact?: boolean;
  inverted?: boolean;
};

export function LoadingState({ title = "Getting things ready", messages = [], compact = false, inverted = false }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(() => {
    if (messages.length < 2) return;
    const timer = setInterval(() => setMessageIndex((current) => (current + 1) % messages.length), 1800);
    return () => clearInterval(timer);
  }, [messages]);

  // Loading states live on green/cream semantic surfaces. Using `text` here
  // keeps them cream in dark mode and deep green in light mode.
  const foreground = inverted ? strictlyColors.white : strictlyColors.text;
  const muted = inverted ? strictlyColors.sage : strictlyColors.textSoft;

  return <View accessibilityRole="progressbar" accessibilityLabel={`${title}. ${messages[messageIndex] || "Loading"}`} style={[styles.wrap, compact && styles.compact]}>
    <View style={[styles.mark, inverted && styles.markInverted, compact && styles.markCompact]}>
      <Animated.View style={[styles.pulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.72] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] }) }] }]} />
      <View style={styles.core} />
    </View>
    <Text style={[styles.title, { color: foreground }, compact && styles.titleCompact]}>{title}</Text>
    {messages.length ? <Text style={[styles.message, { color: muted }]}>{messages[messageIndex]}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 34, paddingHorizontal: 20 },
  compact: { flexDirection: "row", gap: 9, paddingVertical: 0, paddingHorizontal: 0 },
  mark: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.cream },
  markInverted: { backgroundColor: strictlyColors.inkSoft },
  markCompact: { width: 22, height: 22, borderRadius: 11 },
  pulse: { position: "absolute", width: "100%", height: "100%", borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.lime },
  core: { width: 8, height: 8, borderRadius: 4, backgroundColor: strictlyColors.ink },
  title: { marginTop: 13, fontFamily: strictlyType.sansMedium, fontWeight: "800", fontSize: 17, letterSpacing: -0.25 },
  titleCompact: { marginTop: 0, fontSize: 13 },
  message: { marginTop: 5, minHeight: 17, fontFamily: strictlyType.sans, fontSize: 11, textAlign: "center" },
});
