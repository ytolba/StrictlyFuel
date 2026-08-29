import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchAmazonProducts } from "../types/amazon-api";
import { classifyProduct } from "../types/classification";
import { Product } from "../types";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";
import { Ionicons } from "@expo/vector-icons";

interface ProductCategory {
  id: string;
  name: string;
}

const CategoryCard = ({
  category,
  onPress,
}: {
  category: ProductCategory;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.card}>
    <View style={styles.cardInner}>
      <View style={styles.categoryIcon}><Text style={styles.categoryIconText}>{category.name.charAt(0)}</Text></View>
      <Text style={styles.categoryName}>{category.name}</Text>
      <Ionicons name="arrow-forward" size={17} color={strictlyColors.good} />
    </View>
  </TouchableOpacity>
);

const categories: ProductCategory[] = [
  { id: "protein", name: "Protein Powders" },
  { id: "electrolytes", name: "Electrolytes" },
  { id: "milk", name: "Milk" },
  { id: "groceries", name: "Groceries" },
  { id: "oils", name: "Cooking Oils" },
  { id: "snacks", name: "Snacks" },
  { id: "supplements", name: "Supplements" },
  { id: "personal-care", name: "Personal Care" },
];

const CatalogScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const loadCategoryProducts = async (categoryId: string): Promise<Product[]> => {
    setLoading(true);
    try {
      const amazonProducts = await fetchAmazonProducts(categoryId);

      console.log(amazonProducts);
      setProducts(amazonProducts);
      return amazonProducts;
    } catch (error) {
      console.error("Error loading products:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const navigateToCategory = async (categoryId: string) => {
    const loadedProducts = await loadCategoryProducts(categoryId);
    // Navigate to category detail screen
    navigation.navigate("CategoryDetail", {
      categoryId,
      products: loadedProducts.length > 0 ? loadedProducts : products,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>SHOP WITH STANDARDS</Text>
      <Text style={styles.title}>Find your next staple.</Text>
      <Text style={styles.subtitle}>Explore products by category and check what’s inside.</Text>
      {loading && (
        <ActivityIndicator size="large" color={strictlyColors.text} style={styles.loader} />
      )}
      <FlatList
        data={categories}
        renderItem={({ item }) => (
          <CategoryCard
            category={item}
            onPress={() => navigateToCategory(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: strictlyColors.background,
    padding: 20,
    paddingBottom: 100,
  },
  kicker: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 10, letterSpacing: 1, marginTop: 4 },
  title: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 29, letterSpacing: -0.9, marginTop: 7 },
  subtitle: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 20 },
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderRadius: strictlyRadius.medium,
    minHeight: 150,
  },
  cardInner: { flex: 1, padding: 16, justifyContent: "space-between" },
  categoryIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  categoryIconText: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 15 },
  categoryName: {
    color: strictlyColors.text,
    fontSize: 16,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
    lineHeight: 20,
  },
  loader: {
    position: "absolute",
    top: "50%",
    left: "50%",
    zIndex: 1,
  },
});

export default CatalogScreen;
