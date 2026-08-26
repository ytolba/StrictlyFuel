import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { auth, db } from "../firebaseConfig";
import { getScanById } from "../services/scanService";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { loadNutritionProfile } from "../services/nutritionProfileService";
import { scoreIngredients } from "../utils/nutritionScore";

type CreatePostScreenRouteProp = RouteProp<
  {
    CreatePostScreen: {
      scanObject?: string; // Add scan ID parameter
      productInfo?: {
        title: string;
        initialContent: string;
        isReview: boolean;
        scanId: string;
        imageUrl?: string;
        scanDetails: {
          isBased: boolean;
          unknown: boolean;
          stringDetails: string;
          universalLink: string;
        };
      };
    };
  },
  "CreatePostScreen"
>;

const CreatePostScreen: React.FC = () => {
  const route = useRoute<CreatePostScreenRouteProp>();
  const navigation = useNavigation();
  const [scan, setScan] = useState<any>(null);
  const productInfo = route.params?.productInfo;
  const scanId = route.params?.scanObject;

  useEffect(() => {
    console.log("scanId", scanId);
    const fetchScan = async () => {
      if (scanId) {
        try {
          const scanData = await getScanById(scanId);
          setScan(scanData);

          // If scan data exists and no productInfo was passed, create it
          if (scanData && !productInfo) {
            const profile = await loadNutritionProfile();
            const score = scoreIngredients({
              ingredients: scanData.ingredients,
              details: scanData.stringDetails,
              rawText: scanData.rawText,
              unknown: scanData.unknown,
              profile,
            });
            const titlePrefix = score.score === null
              ? "Product review · score unavailable"
              : `${score.score}/100 · ${score.label}`;

            const universalLink = `strictlybased://scan/${scanData.id}`;

            const reviewTemplate = `Strictly score: ${score.score === null ? "Unavailable" : `${score.score}/100`}
${score.label}

Product Details:
${scanData.stringDetails || "No details available"}

My Review:
[Write your review here]

Check out the scan: ${universalLink}

#Strictly #IngredientScore`;

            setTitle(titlePrefix);
            setContent(reviewTemplate);
          }
        } catch (error) {
          console.error("Error fetching scan:", error);
        }
      }
    };

    fetchScan();
  }, [scanId]);

  const [title, setTitle] = useState(productInfo?.title || "");
  const [content, setContent] = useState(productInfo?.initialContent || "");

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be signed in to create a post");
        return;
      }

      const postData = {
        title: title.trim(),
        content: content.trim(),
        author: user.displayName || "Anonymous",
        authorId: user.uid,
        createdAt: serverTimestamp(),
        replies: [],
        isReview: productInfo?.isReview || false,
        scanId: productInfo?.scanId || null,
        imageUrl: productInfo?.imageUrl || null,
        scanDetails: productInfo?.scanDetails || null,
      };

      await addDoc(collection(db, "forum_posts"), postData);
      navigation.goBack();
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {productInfo?.isReview || scan ? "Write Review" : "Create Post"}
        </Text>
        <TouchableOpacity onPress={handleSubmit} style={styles.postButton}>
          <Text style={styles.postText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.inputContainer}>
        {(productInfo?.imageUrl || scan?.imageUrl) && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: productInfo?.imageUrl || scan?.imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          </View>
        )}

        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor="#8E8E93"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <TextInput
          style={styles.contentInput}
          placeholder="What's on your mind?"
          placeholderTextColor="#8E8E93"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1C1E",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2E",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "System",
    marginRight: 20,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: "#8E8E93",
    fontSize: 17,
    fontFamily: "System",
  },
  postButton: {
    padding: 8,
  },
  postText: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "System",
  },
  imageContainer: {
    width: "100%",
    height: 200,
    marginBottom: 16,
    backgroundColor: "#2C2C2E",
    borderRadius: 10,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  inputContainer: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#2C2C2E",
    borderRadius: 10,
    fontFamily: "System",
  },
  contentInput: {
    color: "#FFFFFF",
    fontSize: 17,
    padding: 12,
    backgroundColor: "#2C2C2E",
    borderRadius: 10,
    minHeight: 200,
    textAlignVertical: "top",
    fontFamily: "System",
    fontStyle: "italic",
  },
});

export default CreatePostScreen;
