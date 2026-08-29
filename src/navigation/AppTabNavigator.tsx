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
  // Sit the bar above the home indicator on notched phones, and keep a normal
  // margin on devices that report no bottom inset.
  const bottomGap = Math.max(insets.bottom, strictlyLayout.tabBarMargin);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        animation: "fade",
        tabBarStyle: [styles.tabBar, { bottom: bottomGap, height: strictlyLayout.tabBarHeight }],
        tabBarItemStyle: styles.item,
        tabBarActiveTintColor: strictlyColors.onLime,
        tabBarInactiveTintColor: strictlyColors.textSoft,
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
    position: "absolute",
    left: 12,
    right: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderTopWidth: 1,
    borderTopColor: strictlyColors.border,
    borderRadius: strictlyRadius.xlarge,
    // Keep the floating bar readable over scrolling content.
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  item: { paddingTop: 2 },
  icon: { width: 44, height: 28, borderRadius: strictlyRadius.pill, alignItems: "center", justifyContent: "center" },
  iconActive: { backgroundColor: strictlyColors.lime },
  label: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 10, marginTop: 2 },
  labelActive: { color: strictlyColors.text, fontWeight: "800" },
});
