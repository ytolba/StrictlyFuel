import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import AppTabNavigator from "./AppTabNavigator";
import FlaggedIngredientsScreen from "../screens/FlaggedIngredientsScreen";
import ScanDetailScreen from "src/screens/ScanDetailScreen";
import IngredientScreen from "../screens/IngredientScreen";
import CreatePostScreen from "src/screens/CreatePostScreen";
import CategoryDetailScreen from "src/screens/CategoryDetailScreen";
import { strictlyColors, strictlyType } from "../theme/strictlyTheme";
export type AppStackParamList = {
  Main: undefined;
  Scan: undefined;
  Catalog: undefined;
  History: { scanObject: string };
  Account: undefined;
  Payment: undefined;
  FlaggedIngredientsScreen: { ingredients: string[] };
  ScanHistoryScreen: { scanObject: string };
  CreatePost: {
    scanObject?: string;
    productInfo: {
      title: string;
      initialContent: string;
      isReview: boolean;
      scanId: string;
      imageUrl?: string;
    };
  };
  CategoryDetail: {
    categoryId: string;
    products: Product[];
  };
};

const Stack = createStackNavigator<AppStackParamList>();

export default function AppStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerStyle: {
          backgroundColor: strictlyColors.background,
        },
        headerTintColor: strictlyColors.ink,
        headerTitleStyle: {
          fontFamily: strictlyType.sansMedium,
          fontWeight: "600",
          fontSize: 15,
        },
        cardStyle: {
          backgroundColor: strictlyColors.background,
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={AppTabNavigator}
        options={{
          headerShown: false,
          headerTitleStyle: { fontWeight: undefined },
        }}
      />
      <Stack.Screen
        name="FlaggedIngredientsScreen"
        component={FlaggedIngredientsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScanHistoryScreen"
        component={ScanDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IngredientScreen"
        component={IngredientScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
