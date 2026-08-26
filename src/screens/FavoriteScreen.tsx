// src/screens/FavoriteScreen.tsx

import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

type FavoriteScreenProps = {
  navigation: any; // Replace 'any' with proper type from React Navigation
};

const FavoriteScreen: React.FC<FavoriteScreenProps> = ({ navigation }) => {
  const favorites = [
    { id: "1", name: "Transparent Labs Protein Powder" },
    { id: "2", name: "Apple & Grape Juice" },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.favoriteCard}
            onPress={() => navigation.navigate("ProductDetail")}
          >
            <Text style={styles.productName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

export default FavoriteScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#121212", // Dark background color
  },
  favoriteCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#333", // Darker border for contrast
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#1E1E1E", // Dark card background
  },
  productName: {
    fontSize: 18,
    color: "#FFFFFF", // White text for visibility
  },
});
