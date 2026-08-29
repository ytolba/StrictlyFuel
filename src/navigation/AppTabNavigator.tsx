import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import FuelHomeScreen from "../screens/fuel/FuelHomeScreen";
import DiscoverScreen from "../screens/fuel/DiscoverScreen";
import MealScanScreen from "../screens/fuel/MealScanScreen";
import MyFuelScreen from "../screens/fuel/MyFuelScreen";
import type { CommunityFilters } from "../types/fuel";
import { strictlyColors, strictlyLayout, strictlyRadius, strictlyType } from "../theme/strictlyTheme";
import { useStrictlyAppearance } from "../contexts/AppearanceContext";

export type AppTabParamList = {
  Home: undefined;
  Discover: { filters?: CommunityFilters } | undefined;
  Scan: undefined;
  MyFuel: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const LABELS: Record<keyof AppTabParamList, string> = {
  Home: "Today",
  Discover: "Ideas",
  Scan: "Scan",
  MyFuel: "My fuel",
};

const ICONS: Record<keyof AppTabParamList, [string, string]> = {
  Home: ["home", "home-outline"],
  Discover: ["compass", "compass-outline"],
  Scan: ["camera", "camera-outline"],
  MyFuel: ["bookmark", "bookmark-outline"],
};

export default function AppTabNavigator() {
  const insets = useSafeAreaInsets();
  const { palette } = useStrictlyAppearance();
  // A docked bar owns the bottom edge, so it has to absorb the home-indicator
  // inset itself: the row of items keeps its full height and the inset becomes
  // padding underneath it.
  const barHeight = strictlyLayout.tabBarHeight + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        animation: "fade",
        tabBarStyle: [styles.tabBar, { height: barHeight, paddingBottom: insets.bottom + 6 }],
        tabBarItemStyle: styles.item,
        tabBarActiveTintColor: palette.onLime,
        tabBarInactiveTintColor: palette.textSoft,
        tabBarLabel: ({ focused }) => (
          <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
            {LABELS[route.name]}
          </Text>
        ),
        tabBarIcon: ({ focused }) => {
          const [active, inactive] = ICONS[route.name];
          return (
            <View style={[styles.icon, focused && styles.iconActive]}>
              <Ionicons
                name={(focused ? active : inactive) as any}
                size={19}
                color={focused ? strictlyColors.onLime : strictlyColors.textSoft}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={FuelHomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Scan" component={MealScanScreen} />
      <Tab.Screen name="MyFuel" component={MyFuelScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // Docked to the bottom edge: no absolute positioning, no side margins and
    // no corner radius, so the bar reaches the very bottom of the screen and
    // the navigator reserves space for it instead of overlapping content.
    paddingTop: 8,
    backgroundColor: strictlyColors.surface,
    borderTopWidth: 1,
    borderTopColor: strictlyColors.border,
    // A hairline is enough separation once the bar sits on the edge; the heavy
    // drop shadow only made sense while it floated over the page.
    ...Platform.select({
      android: { elevation: 8 },
      default: {},
    }),
  },
  item: { paddingTop: 2 },
  icon: { width: 44, height: 28, borderRadius: strictlyRadius.pill, alignItems: "center", justifyContent: "center" },
  iconActive: { backgroundColor: strictlyColors.lime },
  label: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 10, marginTop: 2 },
  labelActive: { color: strictlyColors.text, fontWeight: "800" },
});
