import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Linking,
  TouchableWithoutFeedback,
  GestureResponderEvent,
  LayoutChangeEvent,
  Animated,
} from "react-native";
// import {
//   Camera,
//   FlashMode,
//   CameraView,
//   CameraMode,
//   FocusMode,
// } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { extractIngredients } from "../utils/CleanIngredients";
import {
  evaluateIngredients,
  evaluateIngredientsOld,
  classifyEvaluateIngredients,
} from "../utils/gptAPI";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import {
  PinchGestureHandler,
  State as GestureState,
  type TapGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import Reanimated, {
  useAnimatedProps,
  useSharedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { getIngredientScanCache, saveIngredientScanCache, saveScanToHistory } from "../services/scanService";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";

import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { AppTabParamList } from "../navigation/AppTabNavigator"; // Adjust the path as needed
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebaseConfig";
import * as ImageManipulator from "expo-image-manipulator";
import { getFunctions, httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";
import { ingredientCitations, Citations } from "src/utils/ingredientCitations";
import { useRevenueCat } from "../provider/RevenuCatProvider";
import {
  Camera,
  useCameraDevices,
  useCameraDevice,
  getCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { StrictlyBrand } from "../components/StrictlyBrand";
import { PersonalizedScoreCard } from "../components/PersonalizedScoreCard";
import { AlternativeSuggestions } from "../components/AlternativeSuggestions";
import { extractIngredientsWithFallback } from "../services/imageTextExtractionService";
import { strictlyColors, strictlyRadius } from "../theme/strictlyTheme";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO_SIZE = SCREEN_WIDTH * 0.5;
const BOTTOM_SHEET_PEEK_HEIGHT = SCREEN_HEIGHT * 0.25;

const MAX_CHAR_COUNT = 200;

// Define the navigation prop type
type ScanScreenNavigationProp = BottomTabNavigationProp<
  AppTabParamList,
  "Scan"
> & {
  navigate: (screen: string, params: { barcodeValue: string }) => void;
};
Reanimated.addWhitelistedNativeProps({
  zoom: true,
});
const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);

const ScanScreen: React.FC = () => {
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [picture, setPicture] = useState<string>("");
  const [productCategory, setProductCategory] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [productBarcode, setProductBarcode] = useState<string>("");
  const [cameraFlash, setCameraFlash] = useState<FlashMode>("off");
  const [cameraPosition, setCameraPosition] = useState<"front" | "back">(
    "back"
  );
  //const [cameraMode] = useState<CameraMode>("picture");
  const [focusMode, setFocusMode] = useState<"on" | "off">("on"); // Autofocus state
  const [cameraZoom, setCameraZoom] = useState<number>(0);
  const baseZoom = useRef<number>(0);
  const lastScale = useRef<number>(1);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  //const cameraRef = useRef<CameraView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["15%", "85%"], []);

  // The sheet is mounted conditionally after a scan completes. Calling
  // snapToIndex in the same callback as setShowBottomSheet can run before the
  // ref exists, leaving the result sheet hidden. Open it after the mounted
  // sheet has received the completed result state.
  useEffect(() => {
    if (!picture || !showBottomSheet || loading) return;

    const timer = setTimeout(() => {
      bottomSheetRef.current?.snapToIndex(1);
    }, 0);

    return () => clearTimeout(timer);
  }, [picture, showBottomSheet, loading]);

  const [scanned, setScanned] = useState(false);
  const [isBased, setIsBased] = useState<boolean | null>(null);
  const [scanCount, setScanCount] = useState<number>(5);
  const DAILY_SCAN_LIMIT = 5;
  const PREMIUM_SCAN_LIMIT = 50;
  const [scansLeft, setScansLeft] = useState<number>(0);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [scanDone, setScanDone] = useState<boolean>(false);
  const [isOn, setIsOn] = useState(false);
  const translateX = new Animated.Value(isOn ? 20 : 0);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number }>({
    x: 0.5,
    y: 0.5, // Default to center
  });
  const {
    user: rcUser,
    packages,
    purchasePackage,
  } = useRevenueCat();
  const [cameraBox, setCameraBox] = useState<{ width: number; height: number }>(
    {
      width: 0,
      height: 0,
    }
  );
  const [focusAnimation] = useState(new Animated.Value(1));

  const lastPinchScaleRef = useRef<number>(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [focusSquare, setFocusSquare] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const [showFullDetails, setShowFullDetails] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, "back", {
    physicalDevices: [
      "ultra-wide-angle-camera",
      "wide-angle-camera",
      "telephoto-camera",
    ],
  });
  const scanAreaWidth = SCREEN_WIDTH * 0.6;
  const scanAreaHeight = SCREEN_WIDTH * 0.4;
  const scanAreaX = (SCREEN_WIDTH - scanAreaWidth) / 2;
  const scanAreaY = (SCREEN_HEIGHT - scanAreaHeight) / 2;
  const streamGPTResponse = async function (
    extractedIngredients: string[],
    product: any,
    productIngredients: string
  ) {
    let based: boolean | null = null;
    let stringDetails = "";
    if (extractedIngredients.length > 0) {
      const cached = await getIngredientScanCache(extractedIngredients).catch(() => null);
      if (cached) {
        stringDetails = cached.details;
        setDetails(cached.details);
        if (cached.category) setProductCategory(cached.category);
        setIsBased(null);
        setResult("ANALYZED");
        if (user?.uid) {
          await saveScanToHistory(user.uid, extractedIngredients, product.image_url || "", false, productIngredients, false, product.product_name || "Unknown Product", cached.details, {
            category: cached.category || product.categories || "",
            brand: product.brands,
            barcode: product._id,
          });
          await updateUserScanCount(user.uid);
        }
        setShowBottomSheet(true);
        setLoading(false);
        setScanDone(true);
        return;
      }
      let initialChunkReceived = false; // Track first chunk arrival
      let count = 0;
      evaluateIngredients(extractedIngredients, {
        onResult: (analysis) => {
          stringDetails = analysis.explanation;
          setDetails(analysis.explanation);
          if (!productCategory && analysis.category) setProductCategory(analysis.category);
          setIsBased(null);
          setResult("ANALYZED");
          setShowBottomSheet(true);
          bottomSheetRef.current?.snapToIndex(-1);
        },
        // Inside onChunk callback, remove the replacement line
        onChunk: (chunk) => {
          const lowerChunk = chunk.toLowerCase().trim();

          if (!initialChunkReceived) {
            // First chunk logic
            initialChunkReceived = true;
            setShowBottomSheet(true);
            setLoading(false);
            bottomSheetRef.current?.snapToIndex(-1);

            if (lowerChunk === "based") {
              based = true;
            } else if (lowerChunk === "not") {
              based = false;
            } else if (lowerChunk === "unknown") {
              based = null;
            }

            setIsBased(based);
            setResult(
              based === true
                ? "APPROVED"
                : based === false
                ? "REVIEW NEEDED"
                : "UNKNOWN"
            );
          } else {
            // Just append chunk as-is (with **...** still intact)
            setDetails((prev) => prev + chunk);
            stringDetails += chunk;
          }
        },
        onError: async (error) => {
          console.error("Stream Error:", error);
          const errorMessage =
            error.response?.data?.error?.message ||
            error.message ||
            "An unknown error occurred.";

          Alert.alert(
            "Error",
            `Streaming failed. Falling back to non-streaming version: ${errorMessage}`
          );

          try {
            // Fall back to non-streaming API
            const nonStreamingResponse = await evaluateIngredientsOld(
              extractedIngredients
            );

            // Process the non-streaming response
            const lowerResponse = nonStreamingResponse.toLowerCase().trim();
            let based = null;

            if (lowerResponse.startsWith("based")) {
              based = true;
            } else if (lowerResponse.startsWith("not")) {
              based = false;
            } else if (lowerResponse.startsWith("unknown")) {
              based = null;
            }

            setIsBased(based);
            setResult(
              based === true
                ? "APPROVED"
                : based === false
                ? "REVIEW NEEDED"
                : "UNKNOWN"
            );

            // Extract the details after classification
            const cleanedDetails = nonStreamingResponse
              .replace(/^(based|not based|unknown)\s*[:-]?\s*/i, "")
              .trim();
            setDetails(cleanedDetails);

            let unknown = based === null;
            if (user?.uid) {
              await saveScanToHistory(
                user.uid,
                extractedIngredients,
                product.image_url || "",
                based ?? false,
                productIngredients,
                unknown,
                "Unknown Product",
                cleanedDetails,
                {
                  category: product.categories || product.categories_tags_en?.[0] || "",
                  brand: product.brands,
                  barcode: product._id,
                }
              );
              await updateUserScanCount(user.uid);
              const productRef = doc(db, "productScans", product._id);
              const productSnapshot = await getDoc(productRef);
              await setDoc(productRef, {
                barcode: product._id,
                image_url: product.image_url || "",
                ingredients: extractedIngredients,
                based: based ?? false,
                details: stringDetails,
                category: product.categories,
                productName: product.product_name || product.product_name_en || "",
              });
            }

            setShowBottomSheet(true);
            bottomSheetRef.current?.snapToIndex(1);
          } catch (fallbackError) {
            console.error("Fallback error:", fallbackError);
            Alert.alert(
              "Error",
              "Both streaming and non-streaming attempts failed. Please try again later."
            );
          } finally {
            setLoading(false);
          }
        },

        onDone: async () => {
          // Structured analysis is no longer binary. A scan is unknown only
          // when no ingredient evidence was extracted.
          const unknown = extractedIngredients.length === 0;
          await saveIngredientScanCache({
            ingredients: extractedIngredients,
            rawText: productIngredients,
            details: stringDetails,
            category: product.categories || product.categories_tags_en?.[0] || "",
            productName: product.product_name || product.product_name_en || "Unknown Product",
            unknown,
          }).catch(() => undefined);

          // Save scan to history
          if (user?.uid) {
            if (unknown || auth.currentUser?.isAnonymous) {
              const currentCount = await getUserScanCount(user?.uid);
              //setScanCount(currentCount -1);ziad dont uncomment this
            } else {
              await saveScanToHistory(
                user.uid,
                extractedIngredients,
                product.image_url || "",
                based ?? false,
                productIngredients,
                unknown,
                "Unknown Product",
                stringDetails,
                {
                  category: product.categories || product.categories_tags_en?.[0] || "",
                  brand: product.brands,
                  barcode: product._id,
                }
              );
              await updateUserScanCount(user.uid);
              const productRef = doc(db, "productScans", product._id);
              const productSnapshot = await getDoc(productRef);
              await setDoc(productRef, {
                barcode: product._id,
                image_url: product.image_url || "",
                ingredients: extractedIngredients,
                based: based ?? false,
                details: stringDetails,
                category: product.categories,
                productName: product.product_name || product.product_name_en || "",
              });
            }
          }
          setDetails(stringDetails);
          setLoading(false);
          setScanDone(true);
        },
      });
    } else {
      // No ingredients found -> UNKNOWN
      setIsBased(null);
      setResult("UNKNOWN");
      setDetails("No ingredients found in image");
      if (user?.uid) {
        await saveScanToHistory(
          user.uid,
          extractedIngredients,
          product.image_url,
          false,
          productIngredients,
          true,
          "Unknown Product"
        );
        await updateUserScanCount(user.uid);
      }

      // Show bottom sheet even with no chunks
      setShowBottomSheet(true);
      bottomSheetRef.current?.snapToIndex(0);
    }
  };
  const codeScanner = useCodeScanner({
    codeTypes: ["ean-13"],
    onCodeScanned: async (codes) => {
      if (scanned) return;

      for (const code of codes) {
        const idealFrame = {
          height: 396,
          width: 6,
          x: 856,
          y: 370,
        };

        const tolerance = 180; // Adjust this value as needed

        const isWithinRange =
          Math.abs(code.frame.height - idealFrame.height) < tolerance &&
          Math.abs(code.frame.width - idealFrame.width) < tolerance &&
          Math.abs(code.frame.x - idealFrame.x) < tolerance &&
          Math.abs(code.frame.y - idealFrame.y) < tolerance;
        console.log(isWithinRange);
        console.log(code.frame);
        if (!isWithinRange) return;
        const barcodeValue = code.value;
        if (!barcodeValue) return;
        try {
          setScanned(true);
          setLoading(true);
          setDetails("");
          setProductBarcode(barcodeValue);

          // Reference to the productScans collection
          const productRef = doc(db, "productScans", barcodeValue);
          const productSnapshot = await getDoc(productRef);
          console.log(productSnapshot.data());
          if (productSnapshot.exists()) {
            // Product scan already exists, use stored data
            console.log("Using cached product data");
            const productData = productSnapshot.data();
            setIsBased(productData.based);
            // Barcode scans should stay in the scanner/result experience; do
            // not replace the screen with a stored product photo.
            setIngredients(productData.ingredients);
            setDetails(productData.details);
            setProductCategory(productData.category || "");
            setProductName(productData.productName || "");
            setShowBottomSheet(true);
            setScanDone(true); // Add this line
            setLoading(false);
            await saveIngredientScanCache({
              ingredients: productData.ingredients || [],
              rawText: productData.raw_text || productData.ingredients || "",
              details: productData.details || "",
              category: productData.category || "",
              productName: productData.productName || "Unknown Product",
              unknown: productData.unknown === true,
            }).catch(() => undefined);
            await saveScanToHistory(
              user.uid,
              productData.ingredients,
              productData.image_url || "",
              productData.based ?? false,
              productData.ingredients,
              false,
              "Unknown Product",
              productData.details,
              {
                category: productData.category || "",
                brand: productData.brand || "",
                barcode: barcodeValue,
              }
            );
            return;
          }
          // Fetch product details from Open Food Facts API
          let url = `https://world.openfoodfacts.org/api/v3/product/${barcodeValue}.json`;
          const response = await axios.get(url);

          if (response.data.product.ingredients_text == null) {
            setLoading(false);
            Alert.alert(
              "Product Not Found",
              "Let's take a photo of the ingredients list instead to find out whether it meets your standards!",
              [
                {
                  text: "Take Photo of Ingredients",
                  onPress: () => {
                    setScanned(false);
                    setLoading(false);
                    navigation.navigate("IngredientScreen", {
                      barcodeValue: barcodeValue,
                    });
                  },
                },
              ]
            );
            return;
          }
          const product = response.data.product;
          if (product.ingredients_text != null) {
            const currentCount = await getUserScanCount(user.uid);
            const isPremium = await getUserPremium();
            setScanCount(currentCount);
            setScanDone(false);

            if (
              currentCount >= DAILY_SCAN_LIMIT &&
              !(isPremium || rcUser.pro)
            ) {
              handleScanLimitAlert(DAILY_SCAN_LIMIT);
              setLoading(false);
              return;
            } else if (
              (isPremium || rcUser.pro) &&
              currentCount >= PREMIUM_SCAN_LIMIT
            ) {
              handleScanLimitAlert(PREMIUM_SCAN_LIMIT);
              setLoading(false);
              return;
            }

            setScanCount(currentCount + 1);

            // Extract ingredients and category
            const productIngredients =
              product.ingredients_text || "Ingredients not available";
            const extractedIngredients = extractIngredients(productIngredients);
            const productCategory = product.categories
              ? product.categories.split(",")[0]
              : "Unknown";

            setIngredients(extractedIngredients);
            setProductCategory(
              product.categories || product.categories_tags_en?.[0] || ""
            );
            setProductName(product.product_name || product.product_name_en || "");

            // Stream GPT response
            await streamGPTResponse(
              extractedIngredients,
              product,
              productIngredients
            );
            console.log("Scanned product:", details);
            // Save scan to Firestore

            console.log("Saved scan to database");
          } else {
            setLoading(false);
            Alert.alert(
              "New Product",
              "Hey, looks like we've never seen this product before! Let's look at the ingredients.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    setScanned(false); // Reset scanner
                    setLoading(false);
                    navigation.navigate("IngredientScreen", {
                      barcodeValue: barcodeValue, // Changed from barcode to barcodeValue
                    });
                  },
                },
              ]
            );
          }
          setLoading(false);
        } catch (error) {
          setLoading(false);
          Alert.alert(
            "Product Not Found",
            "Let's take a photo of the ingredients list instead to find out whether it meets your standards!",
            [
              {
                text: "Take Photo of Ingredients",
                onPress: () => {
                  setScanned(false);
                  setLoading(false);
                  navigation.navigate("IngredientScreen", {
                    barcodeValue: barcodeValue,
                  });
                },
              },
            ]
          );
        }
        setLoading(false);
      }
    },
  });

  // Helper function to handle scan limit alerts
  const handleScanLimitAlert = (limit) => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    const timeUntilReset = tomorrow.getTime() - now.getTime();
    const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor(
      (timeUntilReset % (1000 * 60 * 60)) / (1000 * 60)
    );

    setLoading(false);
    setScanned(true);

    Alert.alert(
      "Scan Limit Reached",
      `You've reached your daily limit of ${limit} scans.\nResets in ${hoursUntilReset}h ${minutesUntilReset}m`,
      [{ text: "OK", onPress: () => setScanned(false) }]
    );
  };

  console.log("Device supports zoom:", device.minZoom, device.maxZoom);
  useEffect(() => {
    (async () => {
      // Request both camera and microphone permissions
      const cameraPermission = await Camera.requestCameraPermission();

      if (cameraPermission === "granted") {
        setHasPermission(true);
      } else {
        setHasPermission(false);
        Alert.alert(
          "Permission Denied",
          "Camera permissions are required to use this feature."
        );
        setHasPermission(false);
      }
    })();
  }, []);
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const premiumStatus = await getUserPremium();
        setIsPremium(premiumStatus || rcUser.pro); // Default to false if no value is returned
      } catch (error) {
        console.error("Error fetching premium status:", error);
        Alert.alert("Error", "Failed to fetch premium status.");
      }
    };

    if (user) {
      fetchPremiumStatus();
    }
  }, [user]);
  // Add event listener for tabPress
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e) => {
      if (navigation.isFocused()) {
        retakePicture();
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Add new useEffect for initial scan count fetch
  useEffect(() => {
    if (user?.uid) {
      getUserScanCount(user.uid);
    }
  }, [user]);
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const premiumStatus = await getUserPremium();
        setIsPremium(premiumStatus || rcUser.pro); // Default to false if no value is returned
      } catch (error) {
        console.error("Error fetching premium status:", error);
        Alert.alert("Error", "Failed to fetch premium status.");
      }
    };

    fetchPremiumStatus();
  }, []);
  // const handlePinchGestureEvent = (event: any) => {
  //   const { scale } = event.nativeEvent;
  //   const delta = scale - lastScale.current;
  //   lastScale.current = scale;

  //   setCameraZoom((prevZoom) =>
  //     Math.min(Math.max(prevZoom + delta / 10, 0), 1)
  //   );
  // };

  // const handlePinchStateChange = (event: any) => {
  //   if (event.nativeEvent.oldState === GestureState.BEGAN) {
  //     lastScale.current = 1;
  //     baseZoom.current = cameraZoom;
  //   }
  // };

  // const onPinchGesture = useAnimatedGestureHandler({
  //   onStart: (_, context) => {
  //     context.startZoom = zoom;
  //   },
  //   onActive: (event, context) => {
  //     setZoom(Math.max(Math.min(context.startZoom * event.scale, 3), 1)); // Limit zoom level
  //   },
  // });

  // // Camera animated props for zoom
  // const cameraAnimatedProps = useAnimatedProps(() => ({
  //   zoom: zoom,
  // }));
  const retakePicture = () => {
    setImageUri(null);
    setIngredients([]);
    setResult("");
    setDetails("");
    setPicture("");
    setProductCategory("");
    setProductName("");
    setProductBarcode("");
    setScanned(false);
    setShowBottomSheet(false);
  };

  const toggleFlash = () => {
    setCameraFlash((prevFlash) => (prevFlash === "off" ? "on" : "off"));
  };

  // Update getUserScanCount function
  const getUserScanCount = async (userId: string) => {
    try {
      const userScanDoc = await getDoc(doc(db, "userScans", userId));
      const today = new Date().toISOString().split("T")[0];

      if (userScanDoc.exists()) {
        const data = userScanDoc.data();
        if (data.date === today) {
          setScanCount(data.count);
          return data.count;
        } else {
          // Reset count if it's a new day
          await setDoc(doc(db, "userScans", userId), {
            count: 0,
            date: today,
          });
          setScanCount(0);
          return 0;
        }
      } else {
        // Initialize if no document exists
        await setDoc(doc(db, "userScans", userId), {
          count: 0,
          date: today,
        });
        setScanCount(0);
        return 0;
      }
    } catch (error) {
      console.error("Error getting scan count:", error);
      setScanCount(0);
      return 0;
    }
  };

  const updateUserScanCount = async (userId: string) => {
    const userScanRef = doc(db, "userScans", userId);
    const userScanDoc = await getDoc(userScanRef);
    const today = new Date().toISOString().split("T")[0];

    if (userScanDoc.exists()) {
      const data = userScanDoc.data();
      if (data.date === today) {
        await updateDoc(userScanRef, {
          count: data.count + 1,
        });
      } else {
        await setDoc(userScanRef, {
          count: 1,
          date: today,
        });
      }
    } else {
      await setDoc(userScanRef, {
        count: 1,
        date: today,
      });
    }
  };
  const getUserPremium = async () => {
    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.premium;
    } else {
      return false;
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

  const handleIngredient = (ingredientName: string) => {
    const predefinedLinks = ingredientCitations[ingredientName] || [];
  };

  const handleTakePicture = async () => {
    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }

    try {
      const currentCount = await getUserScanCount(user.uid);
      const isPremium = await getUserPremium();
      setScanCount(currentCount); // Immediate update
      setScanDone(false);

      if (currentCount >= DAILY_SCAN_LIMIT && !(isPremium || rcUser.pro)) {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        const timeUntilReset = tomorrow.getTime() - now.getTime();
        const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
        const minutesUntilReset = Math.floor(
          (timeUntilReset % (1000 * 60 * 60)) / (1000 * 60)
        );
        Alert.alert(
          "Scan Limit Reached",
          `You've reached your daily limit of ${DAILY_SCAN_LIMIT} scans.\nResets in ${hoursUntilReset}h ${minutesUntilReset}m`
        );
        return;
        // Alert.alert(
        //   "Scan Limit Reached",
        //   "You've reached your daily limit of 5 scans",
        //   [
        //     {
        //       text: "Upgrade to Premium - $2.99/month",
        //       onPress: handleUpgrade,
        //       style: "default",
        //     },
        //     {
        //       text: "Cancel",
        //       style: "cancel",
        //     },
        //   ],
        //   {
        //     cancelable: true,
        //   }
        // );
        // return;
      } else if (
        (isPremium || rcUser.pro) &&
        currentCount >= PREMIUM_SCAN_LIMIT
      ) {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        const timeUntilReset = tomorrow.getTime() - now.getTime();
        const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
        const minutesUntilReset = Math.floor(
          (timeUntilReset % (1000 * 60 * 60)) / (1000 * 60)
        );

        Alert.alert(
          "Scan Limit Reached",
          `You've reached your daily limit of ${PREMIUM_SCAN_LIMIT} scans.\nResets in ${hoursUntilReset}h ${minutesUntilReset}m`
        );
        return;
      }

      // Update count before taking picture
      setScanCount(currentCount + 1);

      console.log("User ID:", user.uid);
      //const response = await cameraRef.current?.takePictureAsync();
      const response = await cameraRef.current.takePhoto({
        flash: cameraFlash, // or 'on', 'auto'
      });
      console.log(response);
      if (response?.path) {
        console.log("Picture taken:", response.path);
        setPicture(response.path);
        // Both scan modes use the same pipeline: Apple Vision first, then
        // OpenAI vision only if the local OCR cannot read the label.
        await handleImageProcessing(response.path);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture");
    }
  };
  const classifyImage = async (uri: string) => {
    const base64Image = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    let based: boolean | null = null;
    let stringDetails = "";
    let initialChunkReceived = false;
    let extractedIngredients = [];
    let extractedText = "";
    classifyEvaluateIngredients(base64Image, {
      // Inside onChunk callback, remove the replacement line

      onChunk: (chunk) => {
        const lowerChunk = chunk.toLowerCase().trim();

        if (!initialChunkReceived) {
          // First chunk logic
          initialChunkReceived = true;
          setShowBottomSheet(true);
          bottomSheetRef.current?.snapToIndex(-1);

          if (lowerChunk === "based") {
            based = true;
          } else if (lowerChunk === "not") {
            based = false;
          } else if (lowerChunk === "unknown") {
            based = null;
          }

          setIsBased(based);
          setResult(
            based === true ? "APPROVED" : based === false ? "REVIEW NEEDED" : "UNKNOWN"
          );
        } else {
          // Just append chunk as-is (with **...** still intact)
          setDetails((prev) => prev + chunk);
          stringDetails += chunk;
        }
      },
      onError: async (error) => {
        console.error("Stream Error:", error);
        const errorMessage =
          error.response?.data?.error?.message ||
          error.message ||
          "An unknown error occurred.";

        Alert.alert(
          "Error",
          `Streaming failed. Falling back to non-streaming version: ${errorMessage}`
        );

        // try {
        //   // Fall back to non-streaming API
        //   const nonStreamingResponse = await evaluateIngredientsOld(
        //     extractedIngredients
        //   );

        //   // Process the non-streaming response
        //   const lowerResponse = nonStreamingResponse.toLowerCase().trim();
        //   let based = null;

        //   if (lowerResponse.startsWith("based")) {
        //     based = true;
        //   } else if (lowerResponse.startsWith("not")) {
        //     based = false;
        //   } else if (lowerResponse.startsWith("unknown")) {
        //     based = null;
        //   }

        //   setIsBased(based);
        //   setResult(
        //     based === true
        //       ? "APPROVED"
        //       : based === false
        //       ? "REVIEW NEEDED"
        //       : "UNKNOWN"
        //   );

        //   // Extract the details after classification
        //   const cleanedDetails = nonStreamingResponse
        //     .replace(/^(based|not based|unknown)\s*[:-]?\s*/i, "")
        //     .trim();
        //   setDetails(cleanedDetails);

        //   let unknown = based === null;
        //   if (user?.uid) {
        //     await saveScanToHistory(
        //       user.uid,
        //       extractedIngredients,
        //       imageUrl,
        //       based ?? false,
        //       extractedText,
        //       unknown,
        //       "Unknown Product",
        //       cleanedDetails
        //     );
        //     await updateUserScanCount(user.uid);
        //   }

        //   setShowBottomSheet(true);
        //   bottomSheetRef.current?.snapToIndex(1);
        // } catch (fallbackError) {
        //   console.error("Fallback error:", fallbackError);
        //   Alert.alert(
        //     "Error",
        //     "Both streaming and non-streaming attempts failed. Please try again later."
        //   );
        // } finally {
        //   setLoading(false);
        // }
      },

      onDone: async () => {
        // Streaming complete, now parse the full response stored in `details`
        // const responseText = details.toLowerCase().trim();

        // // Clean the GPT response to remove initial classification
        // const cleanedDetails = details
        //   .replace(/^(based|not based|unknown)\s*[:-]?\s*/i, "")
        //   .trim();
        // console.log("Cleaned details:", cleanedDetails);
        // setIsBased(based);
        // setResult(
        //   based === true ? "APPROVED" : based === false ? "REVIEW NEEDED" : "UNKNOWN"
        // );
        // setDetails(cleanedDetails);

        // let unknown: boolean;
        // based === true
        //   ? (unknown = false)
        //   : based === false
        //   ? (unknown = false)
        //   : (unknown = true);

        // // Save scan to history
        // if (user?.uid) {
        //   if (unknown || auth.currentUser?.isAnonymous) {
        //     const currentCount = await getUserScanCount(user?.uid);
        //     //setScanCount(currentCount -1);ziad dont uncomment this
        //   } else {
        //     await saveScanToHistory(
        //       user.uid,
        //       extractedIngredients,
        //       imageUri,
        //       based ?? false,
        //       extractedText,
        //       unknown,
        //       "Unknown Product",
        //       stringDetails // Added this parameter here
        //     );
        //     await updateUserScanCount(user.uid);
        //   }
        // }
        console.log(stringDetails);
        setLoading(false);
        setScanDone(true);
      },
    });
  };
  const handleImageProcessing = async (uri: string) => {
    setLoading(true);

    setDetails(""); // Clear previous details before new streaming starts

    let retryCount = 0;
    const maxRetries = 3;

    const uploadWithRetry = async (
      blob: Blob,
      imageRef: any
    ): Promise<string> => {
      while (retryCount < maxRetries) {
        try {
          const uploadTask = uploadBytesResumable(imageRef, blob);

          return await new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress = Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                console.log(
                  `Upload attempt ${retryCount + 1}, progress: ${progress}%`
                );
              },
              (error) => {
                console.error(
                  `Upload attempt ${retryCount + 1} failed:`,
                  error
                );
                reject(error);
              },
              async () => {
                try {
                  const url = await getDownloadURL(uploadTask.snapshot.ref);
                  console.log("Upload successful, URL:", url);
                  resolve(url);
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
        }
      }
      throw new Error("Max retries exceeded");
    };

    try {
      // Compress image
      const compressedImage = await compressImage(uri);
      console.log("Image compressed successfully");

      // Create unique filename
      const timestamp = Date.now();
      const fileName = `scan_${timestamp}_${Math.random()
        .toString(36)
        .substring(7)}.jpg`;
      const storagePath = `scans/${user?.uid}/${fileName}`;
      console.log("Storage path:", storagePath);

      // Create storage reference
      const imageRef = ref(storage, storagePath);

      // Convert to blob
      const response = await fetch(compressedImage.uri);
      if (!response.ok)
        throw new Error("Failed to fetch image for blob conversion");

      const blob = await response.blob();
      if (!blob) throw new Error("Failed to create blob from image");
      console.log("Blob created successfully, size:", blob.size);

      // Upload with retry logic
      const imageUrl = await uploadWithRetry(blob, imageRef);

      // Extract text from image
      const base64Image = await FileSystem.readAsStringAsync(
        compressedImage.uri,
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );

      const extraction = await extractIngredientsWithFallback(
        compressedImage.uri,
        base64Image
      );
      const extractedText = extraction.text;
      const extractedIngredients = extraction.ingredients;
      setIngredients(extractedIngredients);
      if (extractedIngredients.length > 0) {
        const cached = await getIngredientScanCache(extractedIngredients).catch(() => null);
        if (cached) {
          setDetails(cached.details);
          if (cached.category) setProductCategory(cached.category);
          setIsBased(null);
          setResult("ANALYZED");
          if (user?.uid) {
            await saveScanToHistory(user.uid, extractedIngredients, imageUrl, false, extractedText, false, cached.productName || "Unknown Product", cached.details, {
              category: cached.category || productCategory,
              barcode: productBarcode,
            });
            await updateUserScanCount(user.uid);
          }
          setShowBottomSheet(true);
          setLoading(false);
          setScanDone(true);
          return;
        }
      }
      let based: boolean | null = null;
      let stringDetails = "";
      if (extractedIngredients.length > 0) {
        let initialChunkReceived = false; // Track first chunk arrival
        let count = 0;
        evaluateIngredients(extractedIngredients, {
          onResult: (analysis) => {
            stringDetails = analysis.explanation;
            setDetails(analysis.explanation);
            if (!productCategory && analysis.category) setProductCategory(analysis.category);
            setIsBased(null);
            setResult("ANALYZED");
            setShowBottomSheet(true);
            bottomSheetRef.current?.snapToIndex(-1);
          },
          // Inside onChunk callback, remove the replacement line
          onChunk: (chunk) => {
            const lowerChunk = chunk.toLowerCase().trim();

            if (!initialChunkReceived) {
              // First chunk logic
              initialChunkReceived = true;
              setShowBottomSheet(true);
              bottomSheetRef.current?.snapToIndex(-1);

              if (lowerChunk === "based") {
                based = true;
              } else if (lowerChunk === "not") {
                based = false;
              } else if (lowerChunk === "unknown") {
                based = null;
              }

              setIsBased(based);
              setResult(
                based === true
                  ? "APPROVED"
                  : based === false
                  ? "REVIEW NEEDED"
                  : "UNKNOWN"
              );
            } else {
              // Just append chunk as-is (with **...** still intact)
              setDetails((prev) => prev + chunk);
              stringDetails += chunk;
            }
          },
          onError: async (error) => {
            console.error("Stream Error:", error);
            const errorMessage =
              error.response?.data?.error?.message ||
              error.message ||
              "An unknown error occurred.";

            Alert.alert(
              "Error",
              `Streaming failed. Falling back to non-streaming version: ${errorMessage}`
            );

            try {
              // Fall back to non-streaming API
              const nonStreamingResponse = await evaluateIngredientsOld(
                extractedIngredients
              );

              // Process the non-streaming response
              const lowerResponse = nonStreamingResponse.toLowerCase().trim();
              let based = null;

              if (lowerResponse.startsWith("based")) {
                based = true;
              } else if (lowerResponse.startsWith("not")) {
                based = false;
              } else if (lowerResponse.startsWith("unknown")) {
                based = null;
              }

              setIsBased(based);
              setResult(
                based === true
                  ? "APPROVED"
                  : based === false
                  ? "REVIEW NEEDED"
                  : "UNKNOWN"
              );

              // Extract the details after classification
              const cleanedDetails = nonStreamingResponse
                .replace(/^(based|not based|unknown)\s*[:-]?\s*/i, "")
                .trim();
              setDetails(cleanedDetails);

              await saveIngredientScanCache({
                ingredients: extractedIngredients,
                rawText: extractedText,
                details: cleanedDetails,
                category: productCategory,
                productName: "Unknown Product",
                unknown: based === null,
              }).catch(() => undefined);

              let unknown = based === null;
              if (user?.uid) {
                await saveScanToHistory(
                  user.uid,
                  extractedIngredients,
                  imageUrl,
                  based ?? false,
                  extractedText,
                  unknown,
                  "Unknown Product",
                  cleanedDetails
                );
                await updateUserScanCount(user.uid);
              }

              setShowBottomSheet(true);
              bottomSheetRef.current?.snapToIndex(1);
            } catch (fallbackError) {
              console.error("Fallback error:", fallbackError);
              Alert.alert(
                "Error",
                "Both streaming and non-streaming attempts failed. Please try again later."
              );
            } finally {
              setLoading(false);
            }
          },

          onDone: async () => {
            // Streaming complete, now parse the full response stored in `details`
            // const responseText = details.toLowerCase().trim();

            // // Clean the GPT response to remove initial classification
            // const cleanedDetails = details
            //   .replace(/^(based|not based|unknown)\s*[:-]?\s*/i, "")
            //   .trim();
            // console.log("Cleaned details:", cleanedDetails);
            // setIsBased(based);
            // setResult(
            //   based === true ? "APPROVED" : based === false ? "REVIEW NEEDED" : "UNKNOWN"
            // );
            // setDetails(cleanedDetails);

            const unknown = extractedIngredients.length === 0;
            await saveIngredientScanCache({
              ingredients: extractedIngredients,
              rawText: extractedText,
              details: stringDetails,
              category: productCategory,
              productName: "Unknown Product",
              unknown,
            }).catch(() => undefined);

            // Save scan to history
            if (user?.uid) {
              if (unknown || auth.currentUser?.isAnonymous) {
                const currentCount = await getUserScanCount(user?.uid);
                //setScanCount(currentCount -1);ziad dont uncomment this
              } else {
                await saveScanToHistory(
                  user.uid,
                  extractedIngredients,
                  imageUrl,
                  based ?? false,
                  extractedText,
                  unknown,
                  "Unknown Product",
                  stringDetails // Added this parameter here
                );
                await updateUserScanCount(user.uid);
              }
            }
            console.log(stringDetails);
            setLoading(false);
            setScanDone(true);
          },
        });
      } else {
        // No ingredients found -> UNKNOWN
        setIsBased(null);
        setResult("UNKNOWN");
        setDetails("No ingredients found in image");
        if (user?.uid) {
          await saveScanToHistory(
            user.uid,
            extractedIngredients,
            imageUrl,
            false,
            extractedText,
            true,
            "Unknown Product"
          );
          await updateUserScanCount(user.uid);
        }

        // Show bottom sheet even with no chunks
        setShowBottomSheet(true);
        bottomSheetRef.current?.snapToIndex(0);
      }
    } catch (error: any) {
      console.error("Processing error:", error);
      Alert.alert(
        "UH OH",
        "Failed to process image. Please try again and make sure we can see the ingredients."
      );
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = async (uri: string) => {
    try {
      // First compression pass
      let compressedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Reduced initial width
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Check file size after first pass
      let fileInfo = await FileSystem.getInfoAsync(compressedImage.uri, {
        size: true,
      });
      if (!fileInfo.exists || !fileInfo.size)
        throw new Error("File does not exist or size not available");
      let fileSizeInKB = fileInfo.size / 1024;

      // Second pass if still over 300KB
      if (fileSizeInKB > 300) {
        compressedImage = await ImageManipulator.manipulateAsync(
          compressedImage.uri,
          [{ resize: { width: 600 } }],
          { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG }
        );

        fileInfo = await FileSystem.getInfoAsync(compressedImage.uri);
        if (fileInfo.exists) {
          fileSizeInKB = fileInfo.size / 1024;
        } else {
          throw new Error("File does not exist");
        }

        // Final pass if still over 200KB
        if (fileSizeInKB > 200) {
          compressedImage = await ImageManipulator.manipulateAsync(
            compressedImage.uri,
            [{ resize: { width: 500 } }],
            { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
          );
        }
      }

      console.log("Final image size:", Math.round(fileSizeInKB), "KB");
      return compressedImage;
    } catch (error) {
      console.error("Error compressing image:", error);
      throw error;
    }
  };

  const handleUpgrade = async () => {
    try {
      if (!purchasePackage) {
        Alert.alert("Purchases Unavailable", "Please try again in a moment.");
        return;
      }

      const monthlyPackage =
        packages.find((pack) =>
          pack.identifier.toLowerCase().includes("month")
        ) ?? packages[0];

      if (!monthlyPackage) {
        Alert.alert(
          "Purchases Unavailable",
          "No subscription is currently available. Please try again later."
        );
        return;
      }

      const purchase = await purchasePackage(monthlyPackage);
      if (purchase.error === "cancelled") return;

      if (!purchase.success || !purchase.customerInfo?.entitlements.active.pro) {
        Alert.alert("Purchase Failed", "Please try again.");
        return;
      }

      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          premium: true,
          subscriptionDate: new Date().toISOString(),
        });
      }

      setIsPremium(true);
      setScansLeft(PREMIUM_SCAN_LIMIT);
      setShowUpgradeModal(false);
      Alert.alert(
        "Premium Activated",
        "You now have access to 50 scans per day."
      );
    } catch (error) {
      console.error("Subscription error:", error);
      Alert.alert("Purchase Failed", "Please try again.");
    }
  };
  const handleFocus = (event: any) => {
    if (cameraRef.current) {
      const { locationX, locationY } = event.nativeEvent;
      cameraRef.current.focus({
        x: locationX,
        y: locationY,
      });
      setIsFocused(true);
    }
  };
  const handleTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setFocusSquare({ visible: true, x: locationX, y: locationY });

    // Hide the square after 1 second
    setTimeout(() => {
      setFocusSquare((prevState) => ({ ...prevState, visible: false }));
    }, 1000);

    setIsRefreshing(true);
  };
  const zoom = useSharedValue(device?.neutralZoom || 1);
  // Shared value to store the initial zoom offset during a pinch gesture
  const zoomOffset = useSharedValue(0);
  const tapGesture = Gesture.Tap().onEnd(() => {
    console.log("User tapped the screen!");
  });
  const swipeGesture = Gesture.Pan()
    .onBegin(() => {
      zoomOffset.value = zoom.value;
    })
    .onUpdate((event) => {
      const zoomChange = event.translationY * 0.02; // Sensitivity factor applied here
      const newZoom = zoomOffset.value - zoomChange;

      zoom.value = interpolate(
        newZoom,
        [1, 10],
        [1, 10], // Set your min and max zoom
        Extrapolation.CLAMP
      );
    });
  // Pinch gesture handler
  const gesture = Gesture.Simultaneous(swipeGesture, tapGesture);

  // Animated props for the camera
  const animatedProps = useAnimatedProps(() => ({
    zoom: zoom.value,
  }));
  const UpgradeModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showUpgradeModal}
      onRequestClose={() => setShowUpgradeModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Scan Limit Reached</Text>
          <Text style={styles.modalText}>
            Upgrade to Premium for 50 scans per day!
          </Text>
          <Text style={styles.priceText}>$3.99/month</Text>

          <TouchableOpacity
            style={styles.payButton}
            onPress={handleUpgrade}
          >
            <Text style={styles.payButtonText}>Upgrade Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowUpgradeModal(false)}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  const handleTapToFocus = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;

    // Calculate normalized coordinates for focus (0-1 range)
    const normalizedX = locationX / cameraBox.width;
    const normalizedY = locationY / cameraBox.height;

    setFocusPoint({ x: normalizedX, y: normalizedY });

    // Simulate focus feedback animation
    focusAnimation.setValue(1.5); // Scale up
    Animated.timing(focusAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Programmatically update camera focus if supported
    if (cameraRef.current) {
      console.log("Setting focus point:", normalizedX, normalizedY);
      // Use camera library methods if focus point setting is supported
      // cameraRef.current.setFocusPointOfInterest({ x: normalizedX, y: normalizedY });
    }
  };

  const handleCameraLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCameraBox({ width, height });
  };
  const handleScanLimit = () => {
    Alert.alert(
      "Scan Limit Reached",
      "You've reached your daily limit of 3 scans",
      [
        {
          text: "Upgrade to Premium - $2.99/month",
          onPress: handleUpgrade,
          style: "default",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      {
        cancelable: true,
      }
    );
  };

  const handleScan = () => {
    if (scansLeft <= 0) {
      handleScanLimit();
      return;
    }
    setScansLeft((prev) => prev - 1);
    // Your scan logic here
  };
  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    Animated.timing(translateX, {
      toValue: newState ? 20 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Execute navigation or other function
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <StrictlyBrand size={54} />
        <ActivityIndicator
          size="small"
          color={strictlyColors.lime}
          style={styles.permissionLoader}
        />
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <ReanimatedCamera
            ref={cameraRef}
            style={styles.camera}
            photo={true}
            video={false}
            torch={cameraFlash}
            device={device}
            isActive={true}
            animatedProps={animatedProps}
            enableZoomGesture={false}
            codeScanner={codeScanner}
          />
          {!picture && !isOn ? <BarcodeOverlay scanned={scanned} /> : null}

          <View style={styles.overlayContainer}>
            {!(picture || showBottomSheet) ? (
              <View style={styles.cameraOverlay}>
                <LinearGradient
                  colors={["rgba(7,28,20,0.92)", "rgba(7,28,20,0)"]}
                  style={styles.topScrim}
                  pointerEvents="none"
                />
                <View style={styles.topControlsContainer}>
                  <StrictlyBrand size={38} />
                  <View style={styles.topActions}>
                    <View style={styles.scanCountContainer}>
                      <View style={styles.statusDot} />
                      <Text style={styles.scanCountText}>
                        {Math.max(
                          0,
                          Math.min(
                            isPremium || rcUser.pro ? 50 : 3,
                            (isPremium || rcUser.pro ? 50 : 3) - scanCount
                          )
                        )} LEFT
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.flashButton}
                      onPress={toggleFlash}
                      accessibilityLabel="Toggle flash"
                    >
                      <Ionicons
                        name={cameraFlash === "on" ? "flash" : "flash-outline"}
                        size={19}
                        color={strictlyColors.paper}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modeSwitchWrap}>
                  <TouchableOpacity
                    style={styles.modeSwitch}
                    onPress={handleToggle}
                  >
                    <View style={[styles.modeOption, !isOn && styles.modeOptionActive]}>
                      <Ionicons
                        name="barcode-outline"
                        size={15}
                        color={!isOn ? strictlyColors.ink : strictlyColors.paper}
                      />
                      <Text style={[styles.modeText, !isOn && styles.modeTextActive]}>
                        Barcode
                      </Text>
                    </View>
                    <View style={[styles.modeOption, isOn && styles.modeOptionActive]}>
                      <Ionicons
                        name="document-text-outline"
                        size={15}
                        color={isOn ? strictlyColors.ink : strictlyColors.paper}
                      />
                      <Text style={[styles.modeText, isOn && styles.modeTextActive]}>
                        Ingredients
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.bottomControlsContainer}>
                  <LinearGradient
                    colors={["rgba(7,28,20,0)", "rgba(7,28,20,0.96)"]}
                    style={styles.bottomScrim}
                    pointerEvents="none"
                  />
                  <View style={styles.captureCopy}>
                    <Text style={styles.captureEyebrow}>
                      {isOn ? "INGREDIENT MODE" : "LIVE SCANNER"}
                    </Text>
                    <Text style={styles.captureTitle}>
                      {isOn ? "Frame the ingredient list" : "Point at a barcode"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.captureButton2}
                    onPress={handleTakePicture}
                    accessibilityLabel="Take picture"
                  >
                    <View style={styles.captureButtonInner}>
                      <Ionicons name="scan" size={25} color={strictlyColors.ink} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.resultContainer}>
                {picture ? (
                  <Image source={{ uri: picture }} style={styles.pictureImage} />
                ) : (
                  <View style={styles.barcodeResultBackground} />
                )}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={retakePicture}
                >
                  <Ionicons name="reload-outline" size={30} color="#FFFFFF" />
                </TouchableOpacity>
                {showBottomSheet && (
                  <Modal
                    visible={showBottomSheet && !loading}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowBottomSheet(false)}
                  >
                    <View style={styles.resultModalBackdrop}>
                      <View style={styles.resultModalCard}>
                        <View style={styles.resultModalHeader}>
                          <View style={styles.resultModalHandle} />
                          <TouchableOpacity
                            style={styles.resultModalClose}
                            onPress={() => setShowBottomSheet(false)}
                            accessibilityLabel="Close results"
                          >
                            <Ionicons name="close" size={20} color={strictlyColors.textSoft} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView
                          style={styles.detailsScrollView}
                          contentContainerStyle={styles.resultModalContent}
                          showsVerticalScrollIndicator={false}
                        >
                          <PersonalizedScoreCard
                            ingredients={ingredients}
                            details={details}
                            unknown={ingredients.length === 0}
                          />
                          <AlternativeSuggestions
                            ingredients={ingredients}
                            details={details}
                            category={productCategory}
                            productName={productName}
                            barcode={productBarcode}
                          />
                          {renderDetails(details || "No ingredients found in image")}
                          {scanDone && (
                            <TouchableOpacity
                              style={styles.moreDetailsButton}
                              onPress={() => {
                                const parentStack = navigation.getParent();
                                if (!parentStack) {
                                  console.warn("No parent navigator found");
                                  return;
                                }
                                parentStack.navigate("FlaggedIngredientsScreen", {
                                  rawText: details,
                                });
                              }}
                            >
                              <Text style={styles.moreDetailsText}>More Details</Text>
                            </TouchableOpacity>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>
                )}
              </View>
            )}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Analyzing ingredients...</Text>
              </View>
            )}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

// Update the BarcodeOverlay component interface
interface BarcodeOverlayProps {
  scanned: boolean;
}

const BarcodeOverlay: React.FC<BarcodeOverlayProps> = ({ scanned }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!scanned) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);

      const pulseLoop = Animated.loop(pulse);
      pulseLoop.start();

      return () => {
        pulseLoop.stop();
      };
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [scanned]);

  return (
    <View style={styles.barcodeOverlay}>
      <Animated.View
        style={[
          styles.scanArea,
          {
            transform: [{ scale: pulseAnim }],
            borderColor: scanned
              ? "rgba(0, 255, 0, 0.7)"
              : "rgba(255, 255, 255, 0.5)",
          },
        ]}
      >
        <View style={[styles.cornerTL, scanned && styles.cornerSuccess]} />
        <View style={[styles.cornerTR, scanned && styles.cornerSuccess]} />
        <View style={[styles.cornerBL, scanned && styles.cornerSuccess]} />
        <View style={[styles.cornerBR, scanned && styles.cornerSuccess]} />
        <View
          style={[styles.centerLine, scanned && styles.centerLineSuccess]}
        />
      </Animated.View>
      <View style={styles.scanTextContainer}>
        <Text style={styles.scanText}>Align barcode within frame</Text>
        <Text style={styles.scanSubText}>Hold your phone steady</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: strictlyColors.ink,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: strictlyColors.ink,
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 1, // Sets overlay on top of CameraView
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 190,
  },
  topControlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    zIndex: 3,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: strictlyColors.lime,
  },
  flashButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,28,20,0.66)",
    borderWidth: 1,
    borderColor: "rgba(245,240,230,0.2)",
  },
  modeSwitchWrap: {
    position: "absolute",
    top: 112,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 4,
  },
  modeSwitch: {
    flexDirection: "row",
    padding: 4,
    borderRadius: strictlyRadius.pill,
    backgroundColor: "rgba(7,28,20,0.76)",
    borderWidth: 1,
    borderColor: "rgba(245,240,230,0.16)",
  },
  modeOption: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: strictlyRadius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modeOptionActive: {
    backgroundColor: strictlyColors.lime,
  },
  modeText: {
    color: strictlyColors.paper,
    fontFamily: "System",
    fontSize: 11,
  },
  modeTextActive: {
    color: strictlyColors.ink,
  },
  bottomControlsContainer: {
    height: 154,
    marginHorizontal: -18,
    paddingHorizontal: 22,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  bottomScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  captureCopy: {
    flex: 1,
    paddingBottom: 5,
  },
  captureEyebrow: {
    color: strictlyColors.lime,
    fontFamily: "System",
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  captureTitle: {
    color: strictlyColors.paper,
    fontFamily: "System",
    fontSize: 18,
    letterSpacing: -0.4,
  },
  captureButton2: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(203,230,106,0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(203,230,106,0.45)",
  },
  captureButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: strictlyColors.lime,
    alignItems: "center",
    justifyContent: "center",
  },

  captureButton: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  captureText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "System",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: strictlyColors.ink,
  },
  pictureImage: {
    flex: 1,
    resizeMode: "cover",
  },
  barcodeResultBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: strictlyColors.ink,
  },
  retakeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: strictlyColors.glass,
    borderRadius: strictlyRadius.pill,
    padding: 12,
    zIndex: 2,
    borderWidth: 1,
    borderColor: "rgba(245,240,230,0.18)",
  },
  resultModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(7,28,20,0.58)",
  },
  resultModalCard: {
    height: "85%",
    backgroundColor: strictlyColors.paper,
    borderTopLeftRadius: strictlyRadius.large,
    borderTopRightRadius: strictlyRadius.large,
    overflow: "hidden",
  },
  resultModalHeader: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: strictlyColors.line,
  },
  resultModalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: strictlyColors.sage,
  },
  resultModalClose: {
    position: "absolute",
    right: 16,
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: strictlyColors.cream,
  },
  resultModalContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 36,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  verdictHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingBottom: 18,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: strictlyColors.line,
  },
  verdictIconGood: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: strictlyColors.good,
  },
  verdictIconBad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: strictlyColors.clay,
  },
  verdictIconUnknown: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: strictlyColors.muted,
  },
  verdictLabel: {
    color: strictlyColors.muted,
    fontFamily: "System",
    fontSize: 9,
    letterSpacing: 1.7,
  },
  resultText: {
    fontSize: 70, // Adjust font size as needed
    textAlign: "center",
    fontFamily: "System", // Use the desired font
    color: "#2c2d30", // Uniform black for both cases
  },
  basedText: {
    color: strictlyColors.ink,
    fontFamily: "System",
    fontSize: 27,
    letterSpacing: -0.8,
  },
  focusIndicator: {
    position: "absolute",
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: "yellow",
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 0, 0.2)",
  },
  notBasedText: {
    color: strictlyColors.ink,
    fontFamily: "System",
    fontSize: 27,
    letterSpacing: -0.8,
  },
  unknownText: {
    color: strictlyColors.ink,
    fontFamily: "System",
    fontSize: 27,
    letterSpacing: -0.8,
  },
  focusSquare: {
    position: "absolute",
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "transparent",
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
  linkText: {
    color: "blue",
    textDecorationLine: "underline",
  },

  detailsScrollView: {
    flex: 1,
  },

  bottomSheetBackground: {
    borderTopLeftRadius: strictlyRadius.large,
    borderTopRightRadius: strictlyRadius.large,
  },
  bottomSheetHandle: {
    backgroundColor: strictlyColors.sage,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,28,20,0.88)",
    color: "#00Ff27",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: strictlyColors.paper,
    fontSize: 16,
    marginTop: 12,
    fontFamily: "System",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: strictlyColors.ink,
  },
  permissionLoader: {
    marginTop: 22,
  },
  scanCountText: {
    color: strictlyColors.paper,
    fontSize: 10,
    fontFamily: "System",
    letterSpacing: 1.1,
  },
  scanCountContainer: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(7,28,20,0.66)",
    borderRadius: strictlyRadius.pill,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "rgba(245,240,230,0.2)",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: strictlyColors.paper,
    borderRadius: strictlyRadius.large,
    padding: 26,
    width: "86%",
  },
  modalTitle: {
    color: strictlyColors.ink,
    fontSize: 28,
    fontFamily: "System",
    letterSpacing: -0.8,
    marginBottom: 15,
  },
  modalText: {
    color: strictlyColors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 10,
  },
  priceText: {
    fontSize: 24,
    fontWeight: "bold",
    color: strictlyColors.good,
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: strictlyColors.ink,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: strictlyRadius.pill,
    width: "100%",
    marginBottom: 10,
  },
  payButtonText: {
    color: strictlyColors.lime,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: strictlyColors.muted,
    fontSize: 16,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingTop: 50, // For status bar
  },
  webViewTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginRight: 40,
  },
  closeButton: {
    padding: 8,
  },
  webView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  barcodeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  scanArea: {
    width: SCREEN_WIDTH * 0.76,
    height: SCREEN_WIDTH * 0.48,
    position: "relative",
    borderWidth: 0,
  },

  // Make corners more visible
  cornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: strictlyColors.lime,
    width: 42,
    height: 42,
    borderTopLeftRadius: 12,
  },

  cornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: strictlyColors.lime,
    width: 42,
    height: 42,
    borderTopRightRadius: 12,
  },

  cornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: strictlyColors.lime,
    width: 42,
    height: 42,
    borderBottomLeftRadius: 12,
  },

  cornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: strictlyColors.lime,
    width: 42,
    height: 42,
    borderBottomRightRadius: 12,
  },
  centerLine: {
    position: "absolute",
    top: "50%",
    width: "100%",
    height: 2,
    backgroundColor: strictlyColors.lime,
    shadowColor: strictlyColors.lime,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    transform: [{ translateY: -1 }],
  },
  cornerSuccess: {
    borderColor: strictlyColors.lime,
  },

  centerLineSuccess: {
    backgroundColor: strictlyColors.lime,
  },
  moreDetailsButton: {
    backgroundColor: strictlyColors.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: strictlyRadius.pill,
    marginTop: 20,
    marginBottom: 20,
    alignSelf: "center",
    borderWidth: 0,
    borderColor: "#ffffff",
  },
  moreDetailsText: {
    color: strictlyColors.lime,
    fontSize: 16,
    fontFamily: "System",
    textAlign: "center",
  },
  scanTextContainer: {
    marginTop: 30,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: strictlyRadius.medium,
    backgroundColor: "rgba(7,28,20,0.68)",
    borderWidth: 1,
    borderColor: "rgba(245,240,230,0.14)",
  },
  scanText: {
    color: strictlyColors.paper,
    fontSize: 17,
    fontFamily: "System",
    letterSpacing: -0.2,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scanSubText: {
    color: "rgba(245,240,230,0.7)",
    fontSize: 12,
    fontFamily: "System",
    marginTop: 8,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default ScanScreen;
