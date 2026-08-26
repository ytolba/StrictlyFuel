import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FuelHomeScreen from "../screens/fuel/FuelHomeScreen";
import DiscoverScreen from "../screens/fuel/DiscoverScreen";
import MealScanScreen from "../screens/fuel/MealScanScreen";
import MyFuelScreen from "../screens/fuel/MyFuelScreen";
import FuelProfileScreen from "../screens/fuel/FuelProfileScreen";
import type { CommunityFilters } from "../types/fuel";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

export type AppTabParamList = {
  Home: undefined;
  Discover: { filters?: CommunityFilters } | undefined;
  Scan: undefined;
  MyFuel: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const iconFor = (route: keyof AppTabParamList, focused: boolean) => {
  if (route === "Home") return focused ? "home" : "home-outline";
  if (route === "Discover") return focused ? "compass" : "compass-outline";
  if (route === "MyFuel") return focused ? "bookmark" : "bookmark-outline";
  if (route === "Profile") return focused ? "person" : "person-outline";
  return "camera";
};

export default function AppTabNavigator() {
  return <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarStyle: styles.tabBar,
    tabBarActiveTintColor: strictlyColors.ink,
    tabBarInactiveTintColor: strictlyColors.textSoft,
    tabBarHideOnKeyboard: true,
    tabBarLabel: ({ focused }) => <Text style={[styles.label, focused && styles.labelActive]}>{route.name === "MyFuel" ? "my fuel" : route.name.toLowerCase()}</Text>,
    tabBarIcon: ({ focused, color }) => route.name === "Scan"
      ? <View style={styles.scan}><Ionicons name="camera" size={23} color={strictlyColors.ink} /></View>
      : <View style={[styles.icon, focused && styles.iconActive]}><Ionicons name={iconFor(route.name, focused) as any} size={20} color={color} /></View>,
  })}>
    <Tab.Screen name="Home" component={FuelHomeScreen} />
    <Tab.Screen name="Discover" component={DiscoverScreen} />
    <Tab.Screen name="Scan" component={MealScanScreen} options={{ tabBarLabel: () => <Text style={styles.scanLabel}>scan</Text> }} />
    <Tab.Screen name="MyFuel" component={MyFuelScreen} />
    <Tab.Screen name="Profile" component={FuelProfileScreen} />
  </Tab.Navigator>;
}

const styles = StyleSheet.create({
  tabBar: { position: "absolute", left: 12, right: 12, bottom: 9, height: 70, paddingTop: 7, paddingBottom: 7, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderTopWidth: 1, borderRadius: 24, shadowColor: strictlyColors.black, shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 6 },
  label: { fontFamily: strictlyType.sansMedium, color: strictlyColors.textSoft, fontSize: 8, marginTop: 0 },
  labelActive: { color: strictlyColors.ink, fontWeight: "800" },
  scanLabel: { fontFamily: strictlyType.sansMedium, fontWeight: "800", color: strictlyColors.ink, fontSize: 8 },
  icon: { width: 34, height: 29, borderRadius: strictlyRadius.pill, alignItems: "center", justifyContent: "center" },
  iconActive: { backgroundColor: strictlyColors.cream },
  scan: { width: 48, height: 48, borderRadius: 24, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center", marginTop: -19, borderWidth: 4, borderColor: strictlyColors.background },
});
