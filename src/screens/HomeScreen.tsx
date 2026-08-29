// src/screens/HomeScreen.tsx

import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type HomeScreenProps = {
  navigation: any; // Replace 'any' with proper type from React Navigation
};

// Categories data with vibrant background colors
const categories = [
  { id: "1", name: "Meat & Fish", bgColor: strictlyColors.clay },
  { id: "2", name: "Dairy & Eggs", bgColor: strictlyColors.lime },
  { id: "3", name: "Oils, Butter, Tallow, Ghee, etc", bgColor: strictlyColors.cream },
  { id: "4", name: "Bakery & Snacks", bgColor: "#D5C5A8" },
  { id: "5", name: "Fresh Fruits & Vegetables", bgColor: "#A8C49A" },
  { id: "6", name: "Supplements", bgColor: "#A9C6B0" },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  // Placeholder products
  const products = [
    { id: "1", name: "Re-Lyte Hydration", category: "Groceries" },
    { id: "2", name: "Protein Powder", category: "Supplements" },
  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={strictlyColors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Store"
          placeholderTextColor={strictlyColors.muted}
        />
      </View>

      {/* Category Cards */}
      <View style={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryCard, { backgroundColor: category.bgColor }]}
            onPress={() =>
              navigation.navigate("Category", { name: category.name })
            }
          >
            <Text style={styles.categoryText}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => navigation.navigate("ProductDetail")}
          >
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.productList}
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: strictlyColors.background,
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderRadius: strictlyRadius.medium,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 16,
    flex: 1,
    color: strictlyColors.text,
    fontFamily: strictlyType.sans,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: "48%",
    borderRadius: strictlyRadius.medium,
    padding: 18,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: strictlyColors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  categoryText: {
    fontSize: 16,
    color: strictlyColors.text,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
    textAlign: "center",
  },
  productList: {
    paddingTop: 20,
  },
  productCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: strictlyColors.line,
    borderRadius: strictlyRadius.small,
    marginBottom: 10,
    backgroundColor: strictlyColors.surface,
  },
  productName: {
    fontSize: 18,
    color: strictlyColors.text,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
  },
  productCategory: {
    fontSize: 14,
    color: strictlyColors.muted,
    fontFamily: strictlyType.sans,
  },
});
