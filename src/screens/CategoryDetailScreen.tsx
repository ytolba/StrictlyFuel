import React from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  Text,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Product } from "../types";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

const ProductCard = ({ product }: { product: Product }) => (
  <TouchableOpacity
    style={styles.productCard}
    onPress={() => Linking.openURL(product.link)}
  >
    <Image source={{ uri: product.image }} style={styles.productImage} />
    <Text style={styles.productTitle}>{product.title}</Text>
    <Text style={styles.productPrice}>${product.price}</Text>
  </TouchableOpacity>
);

const CategoryDetailScreen = ({ route }) => {
  const products = route.params.products;
  console.log(route.params.products);
  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: strictlyColors.background,
  },
  productCard: {
    flex: 1,
    margin: 5,
    padding: 10,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderRadius: strictlyRadius.medium,
  },
  productImage: {
    width: "100%",
    height: 150,
    borderRadius: strictlyRadius.small,
  },
  productTitle: {
    fontSize: 14,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
    color: strictlyColors.text,
    marginTop: 8,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: strictlyType.sansBold,
    marginTop: 4,
    color: strictlyColors.good,
  },
});

export default CategoryDetailScreen;
