// src/screens/ProductDetailScreen.tsx

import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

const ProductDetailScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: "https://link-to-product-image.com/product.png" }}
        style={styles.productImage}
      />

      <Text style={styles.productName}>Transparent Labs Protein Powder</Text>
      <Text style={styles.productPrice}>$54.99</Text>

      <Text style={styles.sectionTitle}>Product Details</Text>
      <Text style={styles.productDescription}>
        This is one of the cleanest protein powders on the market. Free of any
        artificial sweeteners, colors, or flavors.
      </Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Purchase</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.favoriteButton}>
        <Text style={styles.favoriteButtonText}>Add to Favorites</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProductDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#121212", // Dark background color
  },
  productImage: {
    width: "100%",
    height: 300,
    resizeMode: "contain",
    marginBottom: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF", // White text color
  },
  productPrice: {
    fontSize: 20,
    color: "#4CAF50",
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    marginTop: 20,
    color: "#FFFFFF",
  },
  productDescription: {
    fontSize: 16,
    color: "#555",
  },
  button: {
    padding: 15,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  favoriteButton: {
    padding: 15,
    backgroundColor: "#FFC107",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  favoriteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
