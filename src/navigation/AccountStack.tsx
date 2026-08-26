import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import AccountScreen from "../screens/AccountScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";

type AccountStackParamList = {
  Account: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

const Stack = createStackNavigator<AccountStackParamList>();

export default function AccountStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#121212", // Top bar background
        },
        headerTintColor: "#ffffff", // Top bar text color
        headerTitleStyle: {
          fontFamily: "System", // Font for top bar titles
          // Remove fontWeight so it doesn't try to access bold variant
          fontWeight: undefined,
        },
      }}
    >
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
