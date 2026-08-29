import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme } from "react-native";
import { strictlyDarkPalette, strictlyLightPalette, type StrictlyPalette } from "../theme/strictlyTheme";

export type AppearanceMode = "system" | "light" | "dark";

type AppearanceContextValue = {
  mode: AppearanceMode;
  resolvedMode: "light" | "dark";
  palette: StrictlyPalette;
  setMode: (mode: AppearanceMode) => void;
};

const STORAGE_KEY = "strictlyfuel:appearance:v1";
const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

export function StrictlyAppearanceProvider({ children }: { children: React.ReactNode }) {
  const systemMode = useColorScheme();
  // Ships dark by default — a fresh install with no saved preference opens
  // dark regardless of the device's system setting. The user can switch to
  // light (or follow system) anytime from Profile -> Appearance.
  const [mode, setModeState] = useState<AppearanceMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
        Appearance.setColorScheme(saved === "system" ? null : saved);
      } else {
        // No saved preference yet (first launch) — force native appearance to
        // match the dark default so components reading the OS scheme directly
        // agree with the app.
        Appearance.setColorScheme("dark");
      }
    }).catch(() => undefined);
  }, []);

  const setMode = (next: AppearanceMode) => {
    setModeState(next);
    Appearance.setColorScheme(next === "system" ? null : next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  };

  const resolvedMode: "light" | "dark" = mode === "system" ? (systemMode === "light" ? "light" : "dark") : mode;
  const value = useMemo<AppearanceContextValue>(() => ({
    mode,
    resolvedMode,
    palette: resolvedMode === "light" ? strictlyLightPalette : strictlyDarkPalette,
    setMode,
  }), [mode, resolvedMode]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useStrictlyAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useStrictlyAppearance must be used inside StrictlyAppearanceProvider");
  return value;
}
