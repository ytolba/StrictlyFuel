import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { useAuth } from "../contexts/AuthContext";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import AuthStackNavigator from "./AuthStackNavigator";
import AppStackNavigator from "./AppStackNavigator";
import OnboardingStackNavigator from "./OnboardingStackNavigator";
import { LoadingState } from "../components/fuel/LoadingState";
import { strictlyColors } from "../theme/strictlyTheme";
import { useStrictlyAppearance } from "../contexts/AppearanceContext";

export default function AppNavigator() {
  const { palette, resolvedMode } = useStrictlyAppearance();
  const { user, loading: authLoading, isPasswordRecovery } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const linking = {
    prefixes: [
      "strictlyfuel://", // Custom URL scheme for deep linking
      Linking.createURL("/"), // Expo-managed linking
    ],
    config: {
      screens: {
        Main: "",
        FuelTarget: "fuel-target",
        BuildMeal: "build-meal",
      },
    },
    // Authentication callbacks are consumed by AuthContext. Allowing React
    // Navigation to parse them as screen paths creates an invalid NotFound
    // navigation before the recovery state has been established.
    filter: (url: string) =>
      !url.startsWith("strictlyfuel://auth/callback") &&
      !url.startsWith("strictlyfuel://reset-password"),
  };

  useEffect(() => {
    const checkIfFirstLaunch = async () => {
      const onboardingSeen = await AsyncStorage.getItem("onboardingSeen");
      setIsFirstLaunch(onboardingSeen === null);
    };

    checkIfFirstLaunch();
  }, []);

  if (isFirstLaunch === null || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState title="StrictlyFuel" messages={["Preparing your fuel plan", "Loading your latest workouts"]} />
      </View>
    );
  }
  return (
    <NavigationContainer
      linking={linking}
      theme={{
        colors: {
          primary: palette.ink,
          background: palette.background,
          card: palette.surface,
          text: palette.text,
          border: palette.border,
          notification: palette.lime,
        },
        dark: resolvedMode === "dark",
        fonts: {
          regular: {
            fontWeight: "normal",
            fontFamily: "System",
          },
          medium: {
            fontWeight: "500",
            fontFamily: "System",
          },
          heavy: {
            fontWeight: "700",
            fontFamily: "System",
          },
          bold: {
            fontWeight: "900",
            fontFamily: "System",
          },
        },
      }}
    >
      {isPasswordRecovery ? (
        <ResetPasswordScreen />
      ) : user ? (
        <AppStackNavigator />
      ) : isFirstLaunch ? (
        <OnboardingStackNavigator />
      ) : (
        <AuthStackNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: strictlyColors.background,
  },
});
