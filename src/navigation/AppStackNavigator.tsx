import React from "react";
import { createStackNavigator, TransitionPresets } from "@react-navigation/stack";
import AppTabNavigator from "./AppTabNavigator";
import FuelTargetScreen from "../screens/fuel/FuelTargetScreen";
import MealBuilderScreen from "../screens/fuel/MealBuilderScreen";
import MealAnalysisScreen from "../screens/fuel/MealAnalysisScreen";
import FixMealScreen from "../screens/fuel/FixMealScreen";
import ShareFuelScreen from "../screens/fuel/ShareFuelScreen";
import CommunityFiltersScreen from "../screens/fuel/CommunityFiltersScreen";
import FuelPostDetailScreen from "../screens/fuel/FuelPostDetailScreen";
import SavedMealsScreen from "../screens/fuel/SavedMealsScreen";
import FoodCaptureScreen from "../screens/fuel/FoodCaptureScreen";
import FuelProfileScreen from "../screens/fuel/FuelProfileScreen";
import MealIdeasScreen from "../screens/fuel/MealIdeasScreen";
import FuelSettingsScreen from "../screens/fuel/FuelSettingsScreen";
import PaywallScreen from "../screens/fuel/PaywallScreen";
import type { CommunityFilters, FuelPost } from "../types/fuel";
import { strictlyColors } from "../theme/strictlyTheme";

export type AppStackParamList = {
  Main: { screen?: string; params?: unknown } | undefined;
  FuelTarget: undefined;
  BuildMeal: { suggestedName?: string } | undefined;
  MealAnalysis: { mealId: string };
  FixMeal: { mealId: string };
  ShareFuel: { mealId: string };
  CommunityFilters: { filters?: CommunityFilters } | undefined;
  FuelPostDetail: { post?: FuelPost; postId?: string };
  SavedMeals: undefined;
  FoodCapture: undefined;
  Profile: undefined;
  MealIdeas: undefined;
  Settings: undefined;
  Paywall: undefined;
};

const Stack = createStackNavigator<AppStackParamList>();

export default function AppStackNavigator() {
  return <Stack.Navigator screenOptions={{
    headerShown: false,
    cardStyle: { backgroundColor: strictlyColors.background },
    gestureEnabled: true,
    gestureResponseDistance: 44,
    ...TransitionPresets.SlideFromRightIOS,
  }}>
    <Stack.Screen name="Main" component={AppTabNavigator} />
    <Stack.Screen name="FuelTarget" component={FuelTargetScreen} />
    <Stack.Screen name="BuildMeal" component={MealBuilderScreen} />
    <Stack.Screen name="MealAnalysis" component={MealAnalysisScreen} />
    <Stack.Screen name="FixMeal" component={FixMealScreen} />
    <Stack.Screen name="ShareFuel" component={ShareFuelScreen} />
    <Stack.Screen name="CommunityFilters" component={CommunityFiltersScreen} options={{ presentation: "modal", ...TransitionPresets.ModalSlideFromBottomIOS }} />
    <Stack.Screen name="FuelPostDetail" component={FuelPostDetailScreen} />
    <Stack.Screen name="SavedMeals" component={SavedMealsScreen} />
    <Stack.Screen name="FoodCapture" component={FoodCaptureScreen} options={{ presentation: "modal", ...TransitionPresets.ModalSlideFromBottomIOS }} />
    <Stack.Screen name="Profile" component={FuelProfileScreen} />
    <Stack.Screen name="MealIdeas" component={MealIdeasScreen} />
    <Stack.Screen name="Settings" component={FuelSettingsScreen} />
    <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: "modal", ...TransitionPresets.ModalSlideFromBottomIOS }} />
  </Stack.Navigator>;
}
