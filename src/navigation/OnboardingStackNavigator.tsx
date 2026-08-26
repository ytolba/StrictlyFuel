import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import OnboardingScreen from "../screens/OnboardingScreen";
import AuthStackNavigator from "./AuthStackNavigator";

type OnboardingStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Auth" component={AuthStackNavigator} />
    </Stack.Navigator>
  );
}
