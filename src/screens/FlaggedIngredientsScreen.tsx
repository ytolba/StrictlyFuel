import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons"; // Example icon library
import LinearGradient from "react-native-linear-gradient";

// Import the ingredient citations
import { ingredientCitations, Citation } from "src/utils/ingredientCitations"; // Adjust path if necessary
import { ScanHistoryItem } from "src/types/scan";
import { strictlyColors, strictlyRadius } from "../theme/strictlyTheme";

const FlaggedIngredientsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { rawText, selectedScan } = route.params as {
    rawText: string;
    selectedScan: ScanHistoryItem;
  };

  // Parse raw text to extract ingredients and their sources
  const parseIngredientsAndSources = (text: string) => {
    const ingredientRegex = /\*\*(.*?)\*\*/g;
    const matches = [...text.matchAll(ingredientRegex)];
    const ingredientsWithSources: {
      ingredient: string;
      sources: Citation[];
    }[] = [];

    for (let i = 0; i < matches.length; i++) {
      const ingredient = matches[i][1].trim();

      // Normalize ingredient name for matching
      const normalizedIngredient = ingredient.toLowerCase();

      // Try different variations of the ingredient name
      let sources: Citation[] = [];
      let matchedName = "";

      // Check exact match first
      if (ingredientCitations[ingredient]) {
        sources = ingredientCitations[ingredient];
        matchedName = ingredient;
      } else {
        // Try to find a matching key in ingredientCitations
        const citationKey = Object.keys(ingredientCitations).find((key) => {
          const variations = key.split("|");
          return variations.some(
            (variant) =>
              variant.toLowerCase() === normalizedIngredient ||
              variant.toLowerCase().includes(normalizedIngredient) ||
              normalizedIngredient.includes(variant.toLowerCase())
          );
        });

        if (citationKey) {
          sources = ingredientCitations[citationKey];
          matchedName = citationKey;
        }
      }

      // If we found sources, add them to our results
      if (sources.length > 0) {
        ingredientsWithSources.push({
          ingredient: matchedName || ingredient,
          sources,
        });
      }
    }

    return ingredientsWithSources;
  };

  const flaggedIngredients = parseIngredientsAndSources(rawText);

  const renderFlaggedIngredients = () => {
    if (!flaggedIngredients.length) {
      return (
        <Text style={styles.noIngredients}>
          No flagged ingredients with sources found.
        </Text>
      );
    }

    return flaggedIngredients.map(({ ingredient, sources }, index) => (
      <View key={index} style={styles.ingredientBlock}>
        <View style={styles.ingredientHeader}>
          <FontAwesome name="exclamation-triangle" size={18} color="#C4D82F" />
          <Text style={styles.ingredientTitle}>{ingredient}</Text>
        </View>
        {sources.map((source, sIndex) => (
          <Text
            key={sIndex}
            style={styles.citationLink}
            onPress={() => Linking.openURL(source.link)}
          >
            {source.title}
          </Text>
        ))}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Flagged Ingredients</Text>
      <ScrollView style={styles.scrollContainer}>
        {renderFlaggedIngredients()}
      </ScrollView>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

export default FlaggedIngredientsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: strictlyColors.paper,
    padding: 16,
  },
  header: {
    fontSize: 22,
    color: strictlyColors.text,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: "System",
    marginTop: 50,
    marginBottom: 25,
    // },
    // logo: {
    //   marginTop: 40,
    //   width: 100,
    //   height: 40,
    //   resizeMode: "contain",
    //   alignSelf: "center",
    //   marginBottom: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  ingredientBlock: {
    marginBottom: 20,
    borderRadius: strictlyRadius.medium,
    padding: 10,
    backgroundColor: strictlyColors.cream,
    shadowColor: strictlyColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5, // For Android shadow
  },

  citationLink: {
    color: strictlyColors.good,
    textDecorationLine: "underline",
    fontSize: 14,
    fontFamily: "System",
  },
  noIngredients: {
    color: strictlyColors.muted,
    textAlign: "center",
    marginVertical: 20,
    fontFamily: "System",
  },
  closeButton: {
    alignSelf: "center",
    backgroundColor: strictlyColors.lime,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: strictlyRadius.pill,
    marginTop: 20,
    marginBottom: 35,
  },
  closeButtonText: {
    fontWeight: "bold",
    color: strictlyColors.text,
    fontSize: 16,
    fontFamily: "System",
  },
  ingredientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ingredientTitle: {
    fontSize: 16,
    color: strictlyColors.text,
    fontWeight: "bold",
    marginLeft: 8, // Space between the icon and text
    fontFamily: "System",
  },
});
