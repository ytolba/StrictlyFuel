import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { strictlyColors, strictlyDarkPalette, strictlyType } from "../theme/strictlyTheme";

type BrandMarkProps = {
  size?: number;
  /** True when the mark sits on the adaptive page; false on a fixed dark ground (splash, onboarding hero). */
  dark?: boolean;
  onCream?: boolean;
};

/** The StrictlyFuel lightning bolt and its accent dot, from the brand kit's 128-unit artboard. */
const BOLT = "M72 17 30 68h31l-5 43 42-55H67z";
const VIEWBOX = "26 13 84 102";
const ASPECT = 84 / 102;

export const StrictlyMark = ({ size = 38, dark = true, onCream = false }: BrandMarkProps) => {
  // The bolt is the accent: lime on the dark grounds, the deep olive accent on
  // light surfaces where lime would disappear. The dot takes the text color so
  // the mark always carries one high-contrast element.
  const bolt = onCream ? strictlyDarkPalette.onLime : dark ? strictlyColors.accentText : strictlyDarkPalette.lime;
  const dot = onCream ? strictlyDarkPalette.onLime : dark ? strictlyColors.text : strictlyDarkPalette.text;
  return (
    <Svg width={size * ASPECT} height={size} viewBox={VIEWBOX} accessibilityLabel="StrictlyFuel">
      <Path d={BOLT} fill={bolt} />
      <Circle cx={98} cy={25} r={8} fill={dot} />
    </Svg>
  );
};

type BrandLockupProps = BrandMarkProps & {
  compact?: boolean;
  style?: ViewStyle;
};

export const StrictlyBrand = ({
  size = 38,
  dark = true,
  onCream = false,
  compact = false,
  style,
}: BrandLockupProps) => (
  <View style={[styles.lockup, style]}>
    <StrictlyMark size={size} dark={dark} onCream={onCream} />
    {!compact && (
      <Text
        style={[
          styles.wordmark,
          { fontSize: Math.max(17, Math.round(size * 0.42)) },
          !dark && styles.wordmarkOnDark,
          onCream && styles.wordmarkOnCream,
        ]}
      >
        StrictlyFuel
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordmark: {
    color: strictlyColors.text,
    fontFamily: strictlyType.sansBold,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  wordmarkOnDark: {
    color: strictlyDarkPalette.text,
  },
  wordmarkOnCream: {
    color: strictlyDarkPalette.onLime,
  },
});
