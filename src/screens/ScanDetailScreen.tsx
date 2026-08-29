import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  useRoute,
  useNavigation,
  NavigationProp,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ImageZoom } from "@likashefqet/react-native-image-zoom";
import BottomSheet from "@gorhom/bottom-sheet";
import { getScanById } from "../services/scanService"; // Adjust the import path
import { ScanHistoryItem } from "../types/scan"; // Adjust the import path
import { strictlyColors, strictlyRadius } from "../theme/strictlyTheme";
import { PersonalizedScoreCard } from "../components/PersonalizedScoreCard";
import { AlternativeSuggestions } from "../components/AlternativeSuggestions";

type RootStackParamList = {
  FlaggedIngredientsScreen: {
    rawText: string;
    selectedScan: ScanHistoryItem;
  };
};

const ScanDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [scan, setScan] = useState<ScanHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const snapPoints = ["20%", "85%"];

  // Fetch the scan by ID when the component mounts
  useEffect(() => {
    const fetchScan = async () => {
      const { scanObject } = route.params as { scanObject: string }; // Extract the scanObject from route.params
      if (!scanObject) {
        setError("Scan ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const scan = await getScanById(scanObject); // Fetch the scan by ID
        if (scan) {
          setScan(scan);
        } else {
          setError("Scan not found.");
        }
      } catch (error) {
        console.error("Error fetching scan:", error);
        setError("Failed to fetch scan. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
  }, [route.params]);
  const renderDetails = (text: string) => {
    // Split the text into parts around **...**
    const parts = text.split(/\*\*(.*?)\*\*/);

    return (
      <Text style={styles.detailsText}>
        {parts.map((part, i) => {
          const isBold = i % 2 === 1;

          let remainingText = part;
          const content = [];

          while (remainingText) {
            // Match patterns like (Source: XYZ) followed by a URL
            const linkMatch = remainingText.match(
              /\(Source: ([^\)]+)\)\s*(https?:\/\/[^\s]+)/i
            );

            if (linkMatch) {
              const [fullMatch, visibleText, url] = linkMatch;
              const beforeLink = remainingText.split(fullMatch)[0];
              const afterLink = remainingText.split(fullMatch)[1];

              // Strip any trailing punctuation from the URL
              const cleanedUrl = url.replace(/[.,;!?]$/, "");

              // Add text before the source, if any
              if (beforeLink) {
                content.push(
                  <Text
                    key={`${i}-${content.length}`}
                    style={isBold ? styles.boldText : undefined}
                  >
                    {beforeLink + "\n"}
                  </Text>
                );
              }

              // Add the clickable source text without showing the link

              // Update the remaining text
              remainingText = afterLink;
            } else {
              // No links found, process the remaining text
              content.push(
                <Text
                  key={`${i}-${content.length}`}
                  style={isBold ? styles.boldText : undefined}
                >
                  {remainingText}
                </Text>
              );
              break;
            }
          }

          return <Text key={i}>{content}</Text>;
        })}
      </Text>
    );
  };

  // Handle back button press
  const handleBack = () => {
    navigation.goBack(); // Navigate back to the previous screen
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#63c2ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#f8f8f8" />
          <Text style={styles.backButtonText}>Back to Scan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!scan) {
    return null; // Return nothing if no scan is found
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#f8f8f8" />
        <Text style={styles.backButtonText}>Back to Scan</Text>
      </TouchableOpacity>

      {/* Full-Screen Image */}
      {scan.imageUrl && (
        <ImageZoom
          uri={scan.imageUrl}
          minScale={1}
          maxScale={5}
          doubleTapScale={3}
          isPanEnabled={true}
          isPinchEnabled={true}
          isSingleTapEnabled={false}
          isDoubleTapEnabled={true}
          style={styles.fullImage}
          resizeMode="cover"
        />
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: strictlyColors.background }]}
        handleIndicatorStyle={styles.bottomSheetHandle}
      >
        <View style={styles.bottomSheetContent}>
          <ScrollView
            style={styles.detailsScrollView}
            showsVerticalScrollIndicator={false}
          >
            <PersonalizedScoreCard
              ingredients={scan.ingredients}
              details={scan.stringDetails}
              rawText={scan.rawText}
              unknown={scan.unknown}
            />
            <AlternativeSuggestions
              ingredients={scan.ingredients}
              details={scan.stringDetails}
              category={scan.category}
              productName={scan.productName}
              barcode={scan.barcode}
            />
            <Text style={styles.detailsText}>
              {renderDetails(
                scan?.stringDetails || "No ingredients found in image"
              )}
            </Text>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate("FlaggedIngredientsScreen", {
                  rawText:
                    scan.stringDetails || "No ingredients found in image",
                  selectedScan: scan, // Pass the scan object
                });
              }}
            >
              <Text style={styles.moreInfoText}>More Details</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: strictlyColors.ink,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: strictlyColors.paper,
    fontFamily: "System",
    marginBottom: 20,
  },
  fullImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29,59,42,0.82)",
    borderRadius: strictlyRadius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: strictlyColors.paper,
    fontSize: 16,
    fontFamily: "System",
    marginLeft: 8,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    textAlign: "center",
  },
  bottomSheetBackground: {
    backgroundColor: strictlyColors.paper,
    borderTopLeftRadius: strictlyRadius.large,
    borderTopRightRadius: strictlyRadius.large,
  },
  bottomSheetHandle: {
    backgroundColor: "#999",
    width: 50,
    height: 5,
    borderRadius: 2.5,
    alignSelf: "center",
    marginVertical: 8,
  },
  detailsScrollView: {
    flex: 1,
  },
  detailsText: {
    fontSize: 16,
    lineHeight: 24,
    color: strictlyColors.text,
    marginBottom: 20,
    fontFamily: "System", // normal variant
  },
  basedText: {
    color: "#2c2d30", // Black for "APPROVED"
    fontFamily: "System",
    fontSize: 60, // Adjust font size as needed
    marginBottom: 0,
  },
  notBasedText: {
    color: "#2c2d30", // Black for "REVIEW NEEDED"
    fontFamily: "System",
    fontSize: 43, // Adjust font size as needed
    marginBottom: 0,
  },
  unknownText: {
    color: "#f8f8f8", // White for "UNKNOWN"
    fontFamily: "System",
    fontSize: 50,
    marginBottom: 0,
  },
  ingredient: {
    fontSize: 16,
    paddingTop: 16,
    color: "#f8f8f8",
    fontFamily: "System",
    marginBottom: 4,
    lineHeight: 24,
  },
  moreInfoText: {
    fontSize: 20, // Adjust font size as needed
    textAlign: "center",
    fontFamily: "System", // Use the desired font
    color: strictlyColors.text,
  },
});

export default ScanDetailScreen;
