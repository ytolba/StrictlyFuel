// src/screens/ScanHistoryScreen.tsx

import React, { useEffect, useState, useCallback,useRef } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { captureRef } from 'react-native-view-shot';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import {
  PinchGestureHandler,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Share from 'react-native-share';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  ScrollView,
  Platform,
  Alert
} from "react-native";
import { getUserScans,getScanById,deleteScan } from "../services/scanService";
import { auth, db } from "../firebaseConfig";
import { useAuth } from "../contexts/AuthContext";
import { ScanHistoryItem } from "../types/scan";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { AppTabParamList } from "../navigation/AppTabNavigator"; // Adjust the path as needed
import { strictlyColors, strictlyRadius } from "../theme/strictlyTheme";
import { PersonalizedScoreCard } from "../components/PersonalizedScoreCard";
import { AlternativeSuggestions } from "../components/AlternativeSuggestions";
import { loadNutritionProfile } from "../services/nutritionProfileService";
import { EMPTY_NUTRITION_PROFILE, NutritionProfile } from "../types/nutritionProfile";
import { scoreIngredients } from "../utils/nutritionScore";
type ScanScreenNavigationProp = BottomTabNavigationProp<
  AppTabParamList,
  "History"
>;
const ScanHistoryScreen: React.FC = ({ route }) => {
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const { user, signOut } = useAuth();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [show,setShow] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);
  const snapPoints = ["20%", "85%"];
  const scanViewRef = useRef();
  useEffect(() => {
    const fetchScan = async () => {
      console.log("this is the" +route.params?.scanObject);
      const id  = route.params?.scanObject;
      console.log(id);
      if (id) {
        try {
          const scan = await getScanById(id); // Fetch the scan from your backend or local storage
          setSelectedScan(scan);
        } catch (error) {
          console.error("Error fetching scan:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchScan();
  }, [route.params?.id]);

  useEffect(() => {
    loadScans();
    loadNutritionProfile().then(setNutritionProfile);
  }, [user]);
  useFocusEffect(
    React.useCallback(() => {
      setShow(true); // Set show to true when the screen comes into focus
    }, [setShow]) // The dependency ensures it only runs when the component is focused
  );
  const handleDeleteScan = async (scanId: string) => {
    if (!user?.uid) return;
  
    try {
      await deleteScan(user.uid, scanId); // Call the delete function
      setScans((prevScans) => prevScans.filter((scan) => scan.id !== scanId)); // Update local state
      setSelectedScan(null); // Clear the selected scan
      Alert.alert("Success", "Scan deleted successfully.");
    } catch (error) {
      console.error("Error deleting scan:", error);
      Alert.alert("Error", "Failed to delete the scan. Please try again.");
    }
  };
  const loadScans = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const userScans = await getUserScans(user.uid);
      setScans(userScans);
    } catch (error) {
      console.error("Error loading scans:", error);
    } finally {
      setLoading(false);
    }
  };

const handleShareScan = async () => {
  if (!selectedScan?.id || !scanViewRef.current) {
    Alert.alert("Error", "No scan selected or view reference missing.");
    return;
  }

  try {
    // Step 1: Capture a screenshot of the scan view
    const screenshotUri = await captureRef(scanViewRef, {
      format: 'png',
      quality: 1,
    });

    // Step 2: Generate a Universal Link
    const universalLink = `strictlybased://scan/${selectedScan.id}`;
    const sharedScore = scoreIngredients({
      ingredients: selectedScan.ingredients,
      details: selectedScan.stringDetails,
      rawText: selectedScan.rawText,
      unknown: selectedScan.unknown,
      profile: nutritionProfile,
    });

    // Step 3: Prepare share options
    const shareOptions = {
      title: 'Strictly ingredient score',
      message: `Strictly score: ${sharedScore.score === null ? "Unavailable" : `${sharedScore.score}/100`}
${sharedScore.label}

Open the scan: ${universalLink}

Download Strictly: https://apps.apple.com/us/app/strictlybased/id6739453393`,
      url: screenshotUri, // Helps create a preview
      subject: 'Strictly scan',
    };

    // Step 4: Share the link
    await Share.open(shareOptions);
  } catch (error) {
    console.error("Error sharing the scan:", error);
    // Alert.alert("Sharing Error", "There was an issue sharing the scan.");
  }
};

  
  
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
                const cleanedUrl = url.replace(/[.,;!?]$/, '');
    
                // Add text before the source, if any
                if (beforeLink) {
                  content.push(
                    <Text
                      key={`${i}-${content.length}`}
                      style={isBold ? styles.boldText : undefined}
                    >
                      {beforeLink +"\n"}
                      
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
    
  const onRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const handleCreateReview = (scan: ScanHistoryItem) => {
    if (!auth.currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to write a review');
      return;
    }

    // Generate title based on scan result
    const scanScore = scoreIngredients({
      ingredients: scan.ingredients,
      details: scan.stringDetails,
      rawText: scan.rawText,
      unknown: scan.unknown,
      profile: nutritionProfile,
    });
    const titlePrefix = scanScore.score === null
      ? "Help identify this product"
      : `${scanScore.score}/100 · ${scanScore.label}`;

    // Generate universal link for the scan
    const universalLink = `strictlybased://scan/${selectedScan.id}`;

    // Simple, clean content template
    const reviewTemplate = `Check it out here: ${universalLink}`;

    setShow(false);
    navigation.navigate('CreatePost', {
      scanObject: scan.id,
      productInfo: {
        title: titlePrefix,
        initialContent: reviewTemplate,
        isReview: true,
        scanId: scan.id,
        imageUrl: scan.imageUrl || "",
        scanDetails: {
          isBased: scan.isBased ?? false,
          unknown: scan.unknown ?? false,
          stringDetails: scan.stringDetails || '',
          universalLink: universalLink
        }
      }
    });
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2c2d30" />
      ) : (
        <>
          {auth.currentUser?.isAnonymous ? (
            <View style={styles.anonMessageContainer}>
              <Text style={styles.anonMessageText}>
                Please sign in or create an account to save and share your scans.
              </Text>
              <TouchableOpacity
                style={styles.anonButton}
                onPress={() => {
                  // Handle navigation to sign-in or sign-up screen
                  signOut();
                }}
              >
                <Text style={styles.anonButtonText}>Sign In / Create Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#2c2d30"
                />
              }
            >
              <View style={styles.gridContainer}>
                {scans.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridItem}
                    onPress={() => {
                      setSelectedScan(item);
                      setShow(true);
                    }}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.thumbnailImage, styles.placeholderImage]} />
                    )}
                    <Text style={styles.basedStatus}>
                      {(() => {
                        const itemScore = scoreIngredients({
                          ingredients: item.ingredients,
                          details: item.stringDetails,
                          rawText: item.rawText,
                          unknown: item.unknown,
                          profile: nutritionProfile,
                        });
                        return itemScore.score === null
                          ? "Score unavailable"
                          : `${itemScore.score}/100 · ${itemScore.label}`;
                      })()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
  
          <Modal
            visible={!!(selectedScan && show)}
            animationType="slide"
            onRequestClose={() => setSelectedScan(null)}
          >
            <View style={styles.modalContainer} ref={scanViewRef}>
              {/* Full-Screen Image */}
              {selectedScan?.imageUrl && (
                <ImageZoom 
                  uri={selectedScan.imageUrl} 
                  minScale={1}          // Minimum zoom level.
                  maxScale={5}          // Maximum zoom level.
                  doubleTapScale={3}    // Zoom level on double-tap.
                  isPanEnabled={true}   // Enable panning.
                  isPinchEnabled={true} // Enable pinch-to-zoom.
                  isSingleTapEnabled={false} // Disable single tap if not needed.
                  isDoubleTapEnabled={true}  // Enable double-tap zoom.
                  style={styles.fullImage}   // Apply your styling.
                  resizeMode="cover"         // Fit the image properly within bounds.
                />
              )}
  
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setSelectedScan(null);
                  setShow(false);
                }}
              >
                <Ionicons name="arrow-back" size={28} color="#f8f8f8" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => selectedScan && handleCreateReview(selectedScan)}
              >
                <Ionicons name="pencil" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareScan}
              >
                <Ionicons name="share-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => selectedScan && handleDeleteScan(selectedScan.id)}
              >
                <Ionicons name="trash-outline" size={24} color="#fff" />
              </TouchableOpacity>

  
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
                    {selectedScan && (
                      <>
                        <PersonalizedScoreCard
                          ingredients={selectedScan.ingredients}
                          details={selectedScan.stringDetails}
                          rawText={selectedScan.rawText}
                          unknown={selectedScan.unknown}
                        />
                        <AlternativeSuggestions
                          ingredients={selectedScan.ingredients}
                          details={selectedScan.stringDetails}
                          category={selectedScan.category}
                          productName={selectedScan.productName}
                          barcode={selectedScan.barcode}
                        />
                      </>
                    )}
                    {renderDetails(
                      selectedScan?.stringDetails ||
                        "No ingredients found in image"
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        const parentStack = navigation.getParent();
                        if (!parentStack) {
                          console.warn("No parent navigator found");
                          return;
                        }
                        setShow(false);
                        parentStack.navigate("FlaggedIngredientsScreen", {
                          rawText: selectedScan?.stringDetails ||
                            "No ingredients found in image", 
                          selectedScan: selectedScan, // Pass the raw text
                        });
                      }}
                    >
                      <Text style={styles.moreInfoText}>More Details</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </BottomSheet>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
  
};

const existingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: strictlyColors.paper,
  },
  thumbnailImage: {
    width: "100%",
    height: "70%",
    borderRadius: 8,
    marginBottom: 5,
  },
  basedStatus: {
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "System",
    textAlign: "center",
  },
  placeholderImage: {
    backgroundColor: strictlyColors.cream,
  },
});

const styles = StyleSheet.create({
  ...existingStyles,
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gridItem: {
    width: "30%",
    aspectRatio: 1,
    marginBottom: 10,
    backgroundColor: strictlyColors.cream,
    borderRadius: strictlyRadius.medium,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContainer: {
    flex: 1,
    position: "relative",
  },
  fullImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  unknownText: {
    color: "#f8f8f8", // White for "UNKNOWN"
    fontFamily: "System",
    fontSize: 50,
    marginBottom: 0,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 30, // Increased for larger circular buttons
    padding: 12, // Increased padding
    width: 52, // Fixed width
    height: 52, // Fixed height
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    textAlign: "center",
  },
  bottomSheetBackground: {
    backgroundColor: "#2c2d30",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    color: strictlyColors.ink,
    marginBottom: 20,
    fontFamily: "System", // normal variant
  },
  boldText: {
    fontFamily: "System", // bold variant
    color: strictlyColors.ink,
  },
  ingredient: {
    fontSize: 16,
    paddingTop: 16,
    color: "#f8f8f8",
    fontFamily: "System",
    marginBottom: 4,
    lineHeight: 24,
  },
  tit: {
    fontSize: 42,
    color: "#f8f8f8",
    fontFamily: "System",
    marginBottom: 4,
    lineHeight: 24,
    textAlign: "center",
    padding: 24,
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
  moreInfoButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreInfoText: {
    fontSize: 20, // Adjust font size as needed
    textAlign: "center",
    fontFamily: "System", // Use the desired font
    color: strictlyColors.ink,
  },
  anonMessageContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: strictlyColors.cream,
    borderRadius: strictlyRadius.medium,
    elevation: 3,
  },
  anonMessageText: {
    fontSize: 18,
    fontWeight: "bold",
    color: strictlyColors.ink,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 26,
  },
  anonButton: {
    backgroundColor: strictlyColors.ink,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: strictlyColors.ink,
  },
  anonButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  shareButton: {
    position: "absolute",
    top: 60,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 30,
    padding: 12,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  deleteButton: {
    position: "absolute",
    top: 60,
    right: 84, // Increased spacing from share button
    zIndex: 10,
    backgroundColor: "rgba(255, 59, 48, 0.8)", // Semi-transparent red
    borderRadius: 30,
    padding: 12,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reviewButton: {
    position: "absolute",
    top: 60,
    right: 152, // Position before share button
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 30,
    padding: 12,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScanHistoryScreen;
