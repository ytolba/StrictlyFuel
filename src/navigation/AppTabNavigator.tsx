import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import FuelHomeScreen from "../screens/fuel/FuelHomeScreen";
import DiscoverScreen from "../screens/fuel/DiscoverScreen";
import MealScanScreen from "../screens/fuel/MealScanScreen";
import PostWorkoutMealsScreen from "../screens/fuel/PostWorkoutMealsScreen";
import MyFuelScreen from "../screens/fuel/MyFuelScreen";
import type { CommunityFilters } from "../types/fuel";
import { strictlyColors, strictlyLayout, strictlyRadius, strictlyType } from "../theme/strictlyTheme";
import { useStrictlyAppearance } from "../contexts/AppearanceContext";
import { useSubscription } from "../provider/RevenuCatProvider";

export type AppTabParamList = {
  Home: undefined;
  Discover: { filters?: CommunityFilters } | undefined;
  Scan: undefined;
  PostWorkout: undefined;
  MyFuel: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const LABELS: Record<keyof AppTabParamList, string> = {
  Home: "Preworkout",
  Discover: "Ideas",
  Scan: "Scan",
  PostWorkout: "Post Workout",
  MyFuel: "My fuel",
};

const ICONS: Record<keyof AppTabParamList, [string, string]> = {
  Home: ["flash", "flash-outline"],
  Discover: ["compass", "compass-outline"],
  Scan: ["camera", "camera-outline"],
  PostWorkout: ["nutrition", "nutrition-outline"],
  MyFuel: ["bookmark", "bookmark-outline"],
};

export default function AppTabNavigator() {
  const insets = useSafeAreaInsets();
  const { palette } = useStrictlyAppearance();
  const { isPro } = useSubscription();
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
              {route.name === "PostWorkout" && !isPro ? <View style={styles.lockBadge}><Ionicons name="lock-closed" size={7} color={strictlyColors.onLime} /></View> : null}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={FuelHomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Scan" component={MealScanScreen} />
      <Tab.Screen name="PostWorkout" component={PostWorkoutMealsScreen} />
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
  lockBadge: { position: "absolute", top: 0, right: 5, width: 13, height: 13, borderRadius: 7, backgroundColor: strictlyColors.cream, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: strictlyColors.surface },
  label: { fontFamily: strictlyType.medium, color: strictlyColors.textSoft, fontSize: 11, marginTop: 2 },
  labelActive: { color: strictlyColors.text, fontFamily: strictlyType.bold },
});
