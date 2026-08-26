// BrandDetailsScreen.tsx

import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";

// Define a typed param list that includes all screens in this stack/tab.
type AppTabParamList = {
  ShopScreen: undefined;
  BrandDetailsScreen: {
    brandName: string;
  };
};

// Create a RouteProp type for BrandDetailsScreen
type BrandDetailsScreenRouteProp = RouteProp<
  AppTabParamList,
  "BrandDetailsScreen"
>;

export default function BrandDetailsScreen() {
  // Access the route with the typed prop
  const route = useRoute<BrandDetailsScreenRouteProp>();

  // Extract the brandName passed from navigation
  const { brandName } = route.params;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{brandName}</Text>
      </View>

      {/* Brand Hero Image or Logo */}
      <Image
        style={styles.brandHero}
        source={{
          uri: "https://media.licdn.com/dms/image/v2/D4E0BAQEzV7SicBj1wA/company-logo_200_200/company-logo_200_200/0/1709836700850/transparent_labs_logo?e=1746662400&v=beta&t=E6FUct8-3OLdx1koc3_5cL-Q1Jk8a79lXOrTjVvQkxQ",
        }}
        resizeMode="contain"
      />

      {/* Brand Description */}
      <Text style={styles.description}>
        Transparent Labs is known for producing top-quality, science-backed
        supplements. Explore their top-selling products below or learn more
        about their commitment to ingredient transparency and premium
        formulations.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  brandHero: {
    width: "100%",
    height: 80,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
  },
});
