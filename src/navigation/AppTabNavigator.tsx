import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStackNavigator } from "@react-navigation/stack";

import ScanScreen from "../screens/ScanScreen";
import ScanHistory from "../screens/ScanHistoryScreen";
import AccountScreen from "../screens/AccountScreen";
import ShopScreen from "src/screens/ShopScreen";
import IngredientScreen from "../screens/IngredientScreen";
import ForumScreen from "../screens/ForumScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import PostDetail from "../screens/PostDetail";
import CatalogScreen from "../screens/CatalogScreen";
import FuelDashboardScreen from "../screens/FuelDashboardScreen";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

export type AppTabParamList = {
  Home: undefined;
  Fuel: undefined;
  Scan: undefined;
  History: { scanObject: string };
  Account: undefined;
  Shop: undefined;
  IngredientScreen: undefined;
  Forum: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };
  Catalog: undefined;
};

const Stack = createStackNavigator();

const ForumStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        gestureEnabled: true,
        headerShown: false,
      }}
    >
      <Stack.Screen name="ForumMain" component={ForumScreen} />
      <Stack.Screen
        name="PostDetail"
        component={PostDetail}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: styles.header,
        headerShadowVisible: false,
        headerTintColor: strictlyColors.ink,
        headerTitleStyle: {
          fontFamily: strictlyType.sansMedium,
          fontWeight: "600",
          fontSize: 15,
        },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: strictlyColors.text,
        tabBarInactiveTintColor: strictlyColors.textSoft,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          marginTop: 0,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        tabBarLabel: ({ focused }) => (
          <Text
            style={[
              styles.tabBarLabel,
              { color: focused ? strictlyColors.text : strictlyColors.textSoft },
            ]}
          >
            {route.name.toLowerCase()}
          </Text>
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          if (route.name === "Scan")
            iconName = focused ? "scan-circle" : "scan-circle-outline";
          else if (route.name === "History")
            iconName = focused ? "time" : "time-outline";
          else if (route.name === "Forum")
            iconName = focused ? "chatbubbles-outline" : "chatbubbles-outline";
          else if (route.name === "Account")
            iconName = focused ? "person-circle" : "person-circle-outline";
          else iconName = "ellipse";
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={iconName as any} size={21} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Fuel"
        component={FuelDashboardScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "flame" : "flame-outline"} size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen name="History" component={ScanHistory} />
      <Tab.Screen
        name="Forum"
        component={ForumStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: strictlyColors.background,
  },
  tabBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    height: 68,
    paddingTop: 6,
    paddingBottom: 7,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderTopWidth: 1,
    borderRadius: strictlyRadius.large,
    shadowColor: strictlyColors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  tabBarLabel: {
    fontSize: 9,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "500",
    letterSpacing: 0,
    textAlign: "center",
  },
  iconWrap: {
    width: 34,
    height: 28,
    borderRadius: strictlyRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: strictlyColors.surfaceMuted,
  },
});
