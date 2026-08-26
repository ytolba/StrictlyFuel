import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import AppTabNavigator from "./AppTabNavigator";
import FuelTargetScreen from "../screens/fuel/FuelTargetScreen";
import MealBuilderScreen from "../screens/fuel/MealBuilderScreen";
import MealAnalysisScreen from "../screens/fuel/MealAnalysisScreen";
import FixMealScreen from "../screens/fuel/FixMealScreen";
import ShareFuelScreen from "../screens/fuel/ShareFuelScreen";
import CommunityFiltersScreen from "../screens/fuel/CommunityFiltersScreen";
import FuelPostDetailScreen from "../screens/fuel/FuelPostDetailScreen";
import SavedMealsScreen from "../screens/fuel/SavedMealsScreen";
import AccountScreen from "../screens/AccountScreen";
import type { CommunityFilters, FuelPost } from "../types/fuel";
import { strictlyColors } from "../theme/strictlyTheme";

export type AppStackParamList = {
  Main: { screen?: string; params?: unknown } | undefined;
  FuelTarget: undefined;
  BuildMeal: undefined;
  MealAnalysis: { mealId: string };
  FixMeal: { mealId: string };
  ShareFuel: { mealId: string };
  CommunityFilters: { filters?: CommunityFilters } | undefined;
  FuelPostDetail: { post?: FuelPost; postId?: string };
  SavedMeals: undefined;
  AccountLegacy: undefined;
};

const Stack = createStackNavigator<AppStackParamList>();

export default function AppStackNavigator() {
  return <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: strictlyColors.background } }}>
    <Stack.Screen name="Main" component={AppTabNavigator} />
    <Stack.Screen name="FuelTarget" component={FuelTargetScreen} />
    <Stack.Screen name="BuildMeal" component={MealBuilderScreen} />
    <Stack.Screen name="MealAnalysis" component={MealAnalysisScreen} />
    <Stack.Screen name="FixMeal" component={FixMealScreen} />
    <Stack.Screen name="ShareFuel" component={ShareFuelScreen} />
    <Stack.Screen name="CommunityFilters" component={CommunityFiltersScreen} options={{ presentation: "modal" }} />
    <Stack.Screen name="FuelPostDetail" component={FuelPostDetailScreen} />
    <Stack.Screen name="SavedMeals" component={SavedMealsScreen} />
    <Stack.Screen name="AccountLegacy" component={AccountScreen} />
  </Stack.Navigator>;
}
