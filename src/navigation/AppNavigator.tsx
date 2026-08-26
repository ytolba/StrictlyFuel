import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { useAuth } from "../contexts/AuthContext";
import AuthStackNavigator from "./AuthStackNavigator";
import AppStackNavigator from "./AppStackNavigator";
import OnboardingStackNavigator from "./OnboardingStackNavigator";
import { LoadingState } from "../components/fuel/LoadingState";
import { strictlyColors } from "../theme/strictlyTheme";

export default function AppNavigator() {
  const { user } = useAuth();
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
        NotFound: "*", // Catch-all for unknown deep links
      },
    },
  };

  useEffect(() => {
    const checkIfFirstLaunch = async () => {
      const onboardingSeen = await AsyncStorage.getItem("onboardingSeen");
      setIsFirstLaunch(onboardingSeen === null);
    };

    checkIfFirstLaunch();
  }, []);

  if (isFirstLaunch === null || user === undefined) {
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
          primary: "#2c2d30",
          background: "#F4F3F2",
          card: "#F4F3F2",
          text: "#2c2d30",
          border: "#F4F3F2",
          notification: "#2c2d30",
        },
        dark: false,
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
      {user ? (
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
