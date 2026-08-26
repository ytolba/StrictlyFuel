import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { View } from "react-native"; // ✅ Removed Text, keeping View
import { Ionicons } from "@expo/vector-icons"; // ✅ Import Ionicons
import ShopScreen from "../screens/ShopScreen";
import BrandDetailsScreen from "../screens/BrandDetailsScreen";

type ShopStackParamList = {
  ShopScreen: undefined;
  BrandDetailsScreen: {
    brandName: string;
  };
};

const Stack = createStackNavigator<ShopStackParamList>();

export default function ShopBrandNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#1e1e1e" },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "bold",
          fontFamily: "System",
        },
      }}
    >
      <Stack.Screen
        name="ShopScreen"
        component={ShopScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BrandDetailsScreen"
        component={BrandDetailsScreen}
        options={{
          title: "Brand Details",
          headerBackImage: () => (
            <View style={{ marginLeft: 10 }}>
              <Ionicons name="chevron-back" size={28} color="white" />{" "}
              {/* ✅ Use Ionicon instead */}
            </View>
          ),
        }}
      />
    </Stack.Navigator>
  );
}
