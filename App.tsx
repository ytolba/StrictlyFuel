import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Animated, Text } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/contexts/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { RevenueCatProvider } from "src/provider/RevenuCatProvider";
import * as Linking from "expo-linking";
import {
  Provider as PaperProvider,
  DefaultTheme,
  configureFonts,
} from "react-native-paper";
import { StrictlyBrand } from "./src/components/StrictlyBrand";
import { strictlyColors, strictlyRadius, strictlyType } from "./src/theme/strictlyTheme";

const SPLASH_BG_COLOR = strictlyColors.ink;

// Create a font configuration; note that we rely on our fonts and set the "medium" variant's fontWeight to undefined.
const fontConfig: any = {
  ios: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "600" },
    light: { fontFamily: "System", fontWeight: "300" },
    thin: { fontFamily: "System", fontWeight: "200" },
  },
  android: {
    regular: { fontFamily: "sans-serif", fontWeight: "400" },
    medium: { fontFamily: "sans-serif-medium", fontWeight: "600" },
    light: { fontFamily: "sans-serif-light", fontWeight: "300" },
    thin: { fontFamily: "sans-serif-thin", fontWeight: "200" },
  },
  default: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "600" },
    light: { fontFamily: "System", fontWeight: "300" },
    thin: { fontFamily: "System", fontWeight: "200" },
  },
};

const theme = {
  ...DefaultTheme,
  roundness: strictlyRadius.small,
  colors: {
    ...DefaultTheme.colors,
    primary: strictlyColors.ink,
    accent: strictlyColors.ink,
    background: strictlyColors.background,
    surface: strictlyColors.surface,
    text: strictlyColors.text,
    placeholder: strictlyColors.textSoft,
  },
  fonts: configureFonts({ config: fontConfig, isV3: false }),
};

const App: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [warningShown, setWarningShown] = useState(false);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(() => setShowOverlay(false));
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {warningShown && (
        <View
          style={[styles.warningWrapper, { backgroundColor: SPLASH_BG_COLOR }]}
        >
          <Text style={styles.warningText}>
            This app is running in Expo Go. Features like in-app purchases will
            not be available.
          </Text>
        </View>
      )}

      <RevenueCatProvider>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.gestureHandler}>
              <AuthProvider>
                <AppNavigator />
              </AuthProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </PaperProvider>
      </RevenueCatProvider>

      {showOverlay && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: SPLASH_BG_COLOR,
              opacity: fadeAnim,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <StrictlyBrand size={64} />
          <Text style={styles.splashTagline}>SHOP WITH STANDARDS.</Text>
        </Animated.View>
      )}
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  gestureHandler: {
    flex: 1,
  },
  warningWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  warningText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "bold",
  },
  splashTagline: {
    marginTop: 18,
    color: strictlyColors.sage,
    fontFamily: strictlyType.mono,
    fontWeight: "600",
    fontSize: 10,
    letterSpacing: 2.4,
  },
});
