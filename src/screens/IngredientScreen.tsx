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
import { evaluateIngredients, evaluateIngredientsOld } from "../utils/gptAPI";
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

import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { AppTabParamList } from "../navigation/AppTabNavigator"; // Adjust the path as needed
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebaseConfig";
import * as ImageManipulator from "expo-image-manipulator";
import { getFunctions, httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";
import { ingredientCitations, Citations } from "src/utils/ingredientCitations";
import { useRevenueCat } from "../provider/RevenuCatProvider";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  Camera,
  useCameraDevices,
  useCameraDevice,
  getCameraDevice,
} from "react-native-vision-camera";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import { RouteProp } from "@react-navigation/native";
import { PersonalizedScoreCard } from "../components/PersonalizedScoreCard";
import { AlternativeSuggestions } from "../components/AlternativeSuggestions";
import axios from "axios";
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
>;
Reanimated.addWhitelistedNativeProps({
  zoom: true,
});
const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);

type IngredientScreenRouteProp = RouteProp<
  {
    IngredientScreen: { barcodeValue: string };
  },
  "IngredientScreen"
>;

const IngredientScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { packages, purchasePackage } = useRevenueCat();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [picture, setPicture] = useState<string>("");
  const [productCategory, setProductCategory] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [cameraFlash, setCameraFlash] = useState<"off" | "on">("off");
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

  // The result sheet is mounted after state changes. Open it on the next
  // render once processing has finished so the ref is ready.
  useEffect(() => {
    if (!picture || !showBottomSheet || loading) return;

    const timer = setTimeout(() => {
      bottomSheetRef.current?.snapToIndex(1);
    }, 0);

    return () => clearTimeout(timer);
  }, [picture, showBottomSheet, loading]);

  const [isBased, setIsBased] = useState<boolean | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [scanDone, setScanDone] = useState<boolean>(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number }>({
    x: 0.5,
    y: 0.5, // Default to center
  });
  const cameraRef = useRef<Camera>(null);
  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, "back", {
    physicalDevices: [
      "ultra-wide-angle-camera",
      "wide-angle-camera",
      "telephoto-camera",
    ],
  });
  console.log("Device supports zoom:", device.minZoom, device.maxZoom);
  const [cameraBox, setCameraBox] = useState<{ width: number; height: number }>(
    { width: 0, height: 0 }
  );
  const route = useRoute<IngredientScreenRouteProp>();
  const barcodeValue = route.params?.barcodeValue;

  useEffect(() => {
    (async () => {
      const status = await Camera.getCameraPermissionStatus();
      if (status === "granted") {
        setHasPermission(true);
      } else if (status === "denied") {
        Alert.alert(
          "Permission Denied",
          "Camera permissions are required to use this feature."
        );
        setHasPermission(false);
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    if (!barcodeValue) return () => { active = false; };
    (async () => {
      try {
        const snapshot = await getDoc(doc(db, "productScans", barcodeValue));
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (active) {
            setProductCategory(data.category || "");
            setProductName(data.productName || "");
          }
          return;
        }
        const response = await axios.get(`https://world.openfoodfacts.org/api/v3/product/${barcodeValue}.json`, { timeout: 7000 });
        const product = response.data?.product;
        if (active && product) {
          setProductCategory(product.categories || product.categories_tags_en?.[0] || "");
          setProductName(product.product_name || product.product_name_en || "");
        }
      } catch {
        // A category is optional for ingredient-photo scans; keep the result focused.
      }
    })();
    return () => { active = false; };
  }, [barcodeValue]);

  // Add event listener for tabPress
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e) => {
      if (navigation.isFocused()) {
        retakePicture();
      }
    });

    return unsubscribe;
  }, [navigation]);

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
    setShowBottomSheet(false);
  };

  const toggleFlash = () => {
    setCameraFlash((prevFlash) => (prevFlash === "off" ? "on" : "off"));
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
      setScanDone(false);
      const response = await cameraRef.current.takePhoto({
        flash: cameraFlash,
      });

      if (response?.path) {
        console.log("Picture taken:", response.path);
        setPicture(response.path);
        await handleImageProcessing(response.path);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture");
    }
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
              barcode: barcodeValue,
            });
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
                  cleanedDetails,
                  { category: productCategory, barcode: barcodeValue }
                );
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
              rawText: extractedText,
              details: stringDetails,
              category: productCategory,
              productName: "Unknown Product",
              unknown,
            }).catch(() => undefined);

            // Save scan to history
            if (user?.uid) {
              // First save to scan history
              await saveScanToHistory(
                user.uid,
                extractedIngredients,
                imageUrl,
                based ?? false,
                extractedText,
                unknown,
                "Unknown Product",
                stringDetails,
                { category: productCategory, barcode: barcodeValue }
              );

              // Then save to product database if barcode exists
              console.log("this is the barcode", barcodeValue);
              if (barcodeValue) {
                const productRef = doc(db, "productScans", barcodeValue);
                await setDoc(productRef, {
                  barcode: barcodeValue,
                  image_url: imageUrl,
                  ingredients: extractedIngredients,
                  based: based ?? false,
                  details: stringDetails,
                  raw_text: extractedText,
                  unknown: unknown,
                  last_updated: new Date(),
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
            imageUrl,
            false,
            extractedText,
            true,
            "Unknown Product"
          );
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

      setShowUpgradeModal(false);
      Alert.alert("Premium Activated", "Premium features are now available.");
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

  // Add back button handler
  const handleBack = () => {
    navigation.goBack();
  };

  // Modify the More Details navigation
  const handleMoreDetails = () => {
    navigation.navigate("FlaggedIngredientsScreen", {
      rawText: details,
    });
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#63C2FF" />
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
      {/* Wrap the entire camera and overlay area with GestureDetector */}
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          {/* Reanimated Camera */}
          <ReanimatedCamera
            ref={cameraRef}
            style={styles.camera}
            photo={true}
            video={false}
            torch={cameraFlash}
            device={device}
            isActive={true}
            animatedProps={animatedProps}
            enableZoomGesture={false} // Disable built-in zoom gesture if using custom pinch-to-zoom
          />

          {/* Overlay Container */}
          <View style={styles.overlayContainer}>
            {!picture ? (
              <View style={styles.cameraOverlay}>
                {/* Top Controls - Modified to include back button and remove scan count */}
                <View style={styles.topControlsContainer}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                  >
                    <Ionicons name="arrow-back" size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.flashButton}
                    onPress={toggleFlash}
                  >
                    <Ionicons
                      name={cameraFlash === "on" ? "flash" : "flash-off"}
                      size={24}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>

                {/* Bottom Controls */}
                <View style={styles.bottomControlsContainer}>
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={handleTakePicture}
                  >
                    <Ionicons name="camera" size={36} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.resultContainer}>
                <Image source={{ uri: picture }} style={styles.pictureImage} />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={retakePicture}
                >
                  <Ionicons name="reload-outline" size={30} color="#FFFFFF" />
                </TouchableOpacity>
                {picture && (
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
                            barcode={barcodeValue}
                          />
                          {renderDetails(details || "No ingredients found in image")}
                          {scanDone && (
                            <TouchableOpacity onPress={handleMoreDetails}>
                              <Text style={styles.moreInfoText}>More Details</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  cameraContainer: {
    flex: 1,
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
    padding: 20,
  },
  topControlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
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
    color: "#2c2d30", // Uniform black for both
  },
  bottomControlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  flashButton: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  resultContainer: {
    flex: 1,
    backgroundColor: "#121212",
  },
  pictureImage: {
    flex: 1,
    resizeMode: "cover",
  },
  retakeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 30,
    padding: 12,
    zIndex: 2,
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
    padding: 20,
    alignItems: "center",
    justifyContent: "center", // Center the text vertically and horizontally
  },
  resultText: {
    fontSize: 70, // Adjust font size as needed
    textAlign: "center",
    fontFamily: "System", // Use the desired font
    color: "#2c2d30", // Uniform black for both cases
  },
  basedText: {
    color: "#2c2d30", // Black for "APPROVED"
    fontFamily: "System",
    fontSize: 60, // Adjust font size as needed
    marginBottom: 0,
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
    color: "#2c2d30",
    marginBottom: 20,
    fontFamily: "System", // normal variant
  },
  boldText: {
    fontFamily: "System", // bold variant
    color: "#2c2d30",
  },
  linkText: {
    color: "blue",
    textDecorationLine: "underline",
  },

  detailsScrollView: {
    flex: 1,
  },

  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: "#2c2d30",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#00Ff27",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 12,
    fontFamily: "System",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "green", //might need to change CHECK CHECK
  },
  scanCountText: {
    color: "#FFFFff",
    fontSize: 16,
    fontFamily: "System",
    marginTop: 3,
  },
  scanCountContainer: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 30,
    padding: 15,
    alignContent: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  priceText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34C759",
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: "#34C759",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: "100%",
    marginBottom: 10,
  },
  payButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#666",
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
  backButton: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});

export default IngredientScreen;
