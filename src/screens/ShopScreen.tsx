import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { getProducts } from "../services/productService"; // Import the getProducts function from your service
import { productItem } from "../types/product"; // Ensure this type matches your product schema
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

const ShopScreen: React.FC = () => {
  const [products, setProducts] = useState<productItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const fetchedProducts = await getProducts();
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open link:", err)
    );
  };

  const renderProduct = ({ item }: { item: productItem }) => (
    <TouchableOpacity
      style={styles.productContainer}
      onPress={() => openLink(item.link || "#")}
    >
      <Image source={{ uri: item.imageUrl || "https://via.placeholder.com/150" }} style={styles.productImage} />
      <Text style={styles.productName}>{item.title || "Unnamed Product"}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={strictlyColors.text} />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      ) : (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Nothing here yet.</Text>
        <Text style={styles.emptyText}>New Strictly-approved products are on the way.</Text>
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: strictlyColors.background,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: strictlyColors.muted,
    fontFamily: strictlyType.sans,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 18,
    color: strictlyColors.muted,
    marginTop: 8,
    fontFamily: strictlyType.sans,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: strictlyColors.text,
    fontFamily: strictlyType.sansBold,
    fontSize: 21,
    marginBottom: 7,
  },
  grid: {
    justifyContent: "space-between",
  },
  productContainer: {
    flex: 1,
    margin: 8,
    backgroundColor: strictlyColors.white,
    borderRadius: strictlyRadius.medium,
    overflow: "hidden",
    elevation: 3,
    shadowColor: strictlyColors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    resizeMode: "cover",
  },
  productName: {
    fontSize: 16,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
    color: strictlyColors.text,
    padding: 12,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    color: "#888",
    paddingBottom: 10,
  },
});

export default ShopScreen;
