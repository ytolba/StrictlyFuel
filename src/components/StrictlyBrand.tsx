import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { strictlyColors, strictlyType } from "../theme/strictlyTheme";

type BrandMarkProps = {
  size?: number;
  dark?: boolean;
};

export const StrictlyMark = ({ size = 38, dark = true }: BrandMarkProps) => (
  <Svg width={size * 0.88} height={size} viewBox="0 0 100 113.2">
    <Polygon
      points="61.4,0 100,0 82.6,16.4 68.5,16.5 25.1,55.5 25,63 33.1,63.3 65.7,34.4 93.2,34.2 93.3,63.7 38.6,113.2 0,113.2 17.4,96.8 31.5,96.7 74.9,57.7 75,50.2 66.9,49.9 34.3,78.8 6.8,79 6.7,49.5"
      fill={dark ? strictlyColors.paper : strictlyColors.ink}
    />
  </Svg>
);

type BrandLockupProps = BrandMarkProps & {
  compact?: boolean;
  style?: ViewStyle;
};

export const StrictlyBrand = ({
  size = 38,
  dark = true,
  compact = false,
  style,
}: BrandLockupProps) => (
  <View style={[styles.lockup, style]}>
    <StrictlyMark size={size} dark={dark} />
    {!compact && (
      <View style={styles.wordmark}>
        <Text style={[styles.strictly, !dark && styles.strictlyLight]}>
          STRICTLY
        </Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  strictly: {
    color: strictlyColors.paper,
    fontFamily: strictlyType.sansBold,
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 2.4,
  },
  strictlyLight: {
    color: strictlyColors.ink,
  },
});
