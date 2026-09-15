import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Animated, Text } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import Constants from "expo-constants";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/contexts/AuthContext";
import { FuelProvider } from "./src/contexts/FuelContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { RevenueCatProvider } from "src/provider/RevenuCatProvider";
import * as Linking from "expo-linking";
import {
  Provider as PaperProvider,
  MD2LightTheme,
  configureFonts,
} from "react-native-paper";
import { StrictlyBrand } from "./src/components/StrictlyBrand";
import { strictlyDarkPalette, strictlyRadius, strictlyType } from "./src/theme/strictlyTheme";
import { StrictlyAppearanceProvider, useStrictlyAppearance } from "./src/contexts/AppearanceContext";

const SPLASH_BG_COLOR = strictlyDarkPalette.background;

// React Native Paper components use the same Space Grotesk faces as the rest of the app.
const paperFaces = {
  regular: { fontFamily: strictlyType.regular },
  medium: { fontFamily: strictlyType.semibold },
  light: { fontFamily: strictlyType.light },
  thin: { fontFamily: strictlyType.light },
};
const fontConfig: any = { ios: paperFaces, android: paperFaces, default: paperFaces };

const AppContent: React.FC = () => {
  const { palette } = useStrictlyAppearance();
  const [showOverlay, setShowOverlay] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [warningShown, setWarningShown] = useState(false);

  const theme: React.ComponentProps<typeof PaperProvider>["theme"] = {
    ...MD2LightTheme,
    roundness: strictlyRadius.small,
    colors: {
      ...MD2LightTheme.colors,
      primary: palette.ink,
      accent: palette.lime,
      background: palette.background,
      surface: palette.surface,
      text: palette.text,
      placeholder: palette.textSoft,
    },
    fonts: configureFonts({ config: fontConfig, isV3: false }),
  };

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
          <Text style={[styles.warningText, { color: palette.text }]}>
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
                <FuelProvider>
                  <AppNavigator />
                </FuelProvider>
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
          <StrictlyBrand size={64} dark={false} />
          <Text style={styles.splashTagline}>FUEL THE WORK.</Text>
        </Animated.View>
      )}
    </View>
  );
};

const App: React.FC = () => {
  const [fontsLoaded, fontError] = useFonts({ SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  // Hold on the splash color for the brief font load so text never flashes in the system face.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: SPLASH_BG_COLOR }} />;
  return (
    <StrictlyAppearanceProvider>
      <AppContent />
    </StrictlyAppearanceProvider>
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
    fontSize: 16,
    textAlign: "center",
    fontFamily: strictlyType.bold,
  },
  splashTagline: {
    marginTop: 18,
    color: strictlyDarkPalette.inverseText,
    fontFamily: strictlyType.semibold, 
    fontSize: 11,
    letterSpacing: 2.4 },
});
