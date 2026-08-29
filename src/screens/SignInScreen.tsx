import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { APPLE_SIGN_IN_ENABLED } from "../config/authFeatures";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

const SignInScreen: React.FC = () => {
  const {
    signInWithEmail,
    resetPassword,
    continueWithoutAccount,
    signInWithApple,
  } = useAuth();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const [togglePosition] = useState(new Animated.Value(0));
  const screenWidth = Dimensions.get("window").width;
  const toggleWidth = (screenWidth - 60) / 2; // 60 is the total horizontal padding (30 * 2)

  const animateToggle = (toValue: number) => {
    if (toValue === 1) {
      setTimeout(() => navigation.navigate("SignUp"), 300); // Delay navigation slightly
    }
    Animated.spring(togglePosition, {
      toValue,
      useNativeDriver: true,
      bounciness: 6, // Reduced bounciness
      speed: 8, // Reduced speed for longer animation
    }).start();
  };

  // A helper function that returns a promise which resolves based on the user's response
  const showAlert = () => {
    return new Promise<void>((resolve, reject) => {
      Alert.alert(
        "Confirm",
        "Are you sure you want to continue without an Account? Your scans may not be saved.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => reject(new Error("User cancelled")),
          },
          { text: "Yes", style: "destructive", onPress: () => resolve() },
        ]
      );
    });
  };
  const handleEmailSignIn = async () => {
    setErrorMessage(null);
    if (!email || !password) {
      Alert.alert("Sign In Error", "Please enter both email and password.", [
        { text: "OK" },
      ]);
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);

      // navigation.reset({
      //   index: 0,
      //   routes: [{ name: "AppTabNavigator" }],
      // });
    } catch (error: any) {
      // Handle common Auth errors
      let msg = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
            msg = "No account found with this email.";
            break;
          case "auth/wrong-password":
            msg = "Incorrect password. Please try again.";
            break;
          case "auth/invalid-email":
            msg = "Invalid email address. Please check the format.";
            break;
          case "auth/user-disabled":
            msg = "This account has been disabled.";
            break;
          default:
            msg = error.message || msg;
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    if (!email) {
      Alert.alert(
        "Email required",
        "Enter your email address first, then try resetting your password.",
        [{ text: "OK" }]
      );
      return;
    }
    setIsForgotLoading(true);

    try {
      console.log("WORKING");

      console.log(email);
      await resetPassword(email);
      Alert.alert("Password Reset", "Password reset link sent to your email.", [
        { text: "OK" },
      ]);
    } catch (error: any) {
      let msg = "Failed to send reset link.";
      if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
            msg = "No account found with this email.";
            break;
          case "auth/invalid-email":
            msg = "Invalid email address.";
            break;
          default:
            msg = error.message || msg;
        }
      }
      Alert.alert("Password Reset Error", msg, [{ text: "OK" }]);
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    console.log("Apple Sign In button pressed");
    try {
      setIsLoading(true);
      console.log("Starting Apple Sign In process");
      const user = await signInWithApple();
      console.log("Got user from Apple Sign In:", user);

      // Navigate regardless of user object (since we have the Apple credential)
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Image
              source={require("../../assets/branding/strictly-lockup.png")}
              style={styles.logo}
            />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Your workouts, fuel targets, and meals stay together here.</Text>
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            <View style={styles.formContainer}>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, styles.toggleButtonActive]}
                  onPress={() => animateToggle(0)}
                >
                  <Text style={[styles.toggleText, styles.toggleActive]}>Sign in</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => animateToggle(1)}
                >
                  <Text style={styles.toggleText}>Create account</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, styles.placeholderFont]}
                placeholder="Email"
                placeholderTextColor={strictlyColors.textSoft}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, styles.placeholderFont]}
                placeholder="Password"
                placeholderTextColor={strictlyColors.textSoft}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleEmailSignIn}
              />
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleEmailSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={strictlyColors.onLime} />
                ) : (
                  <>
                    <Ionicons name="arrow-forward" size={18} color={strictlyColors.onLime} />
                    <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                      Continue with email
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {APPLE_SIGN_IN_ENABLED && (
                <>
                  <View style={styles.orContainer}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.orLine} />
                  </View>
                  <TouchableOpacity
                    style={styles.appleButton}
                    onPress={() => {
                      console.log("Button pressed directly");
                      handleAppleSignIn();
                    }}
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-apple" size={20} color={strictlyColors.text} />
                    <Text style={styles.appleButtonText}>
                      Sign in with Apple
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.noAccountButton}
                onPress={async () => {
                  try {
                    // Wait for the alert response
                    await showAlert();

                    await continueWithoutAccount();
                  } catch (error) {
                    setErrorMessage(error instanceof Error ? error.message : "Unable to continue without an account.");
                  }
                }}
              >
                <Text style={styles.NoAccountText}>
                  <Text style={styles.NoAccountLink}>
                    Continue Without Account
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={[
                styles.forgotPasswordButton,
                isForgotLoading && styles.buttonDisabled,
              ]}
              disabled={isForgotLoading}
            >
              {isForgotLoading ? (
                <ActivityIndicator color={strictlyColors.textSoft} />
              ) : (
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              )}
            </TouchableOpacity>

            <View style={styles.taglineContainer}>
              <Text style={styles.subtitle2}></Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: strictlyColors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  placeholderFont: {
    fontFamily: strictlyType.sans,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 164,
    height: 132,
    resizeMode: "contain",
    marginBottom: 8,
  },
  taglineContainer: {
    marginVertical: 10,
    alignItems: "center",
  },
  subtitle2: {
    fontSize: 25,
    color: strictlyColors.textSoft,
    textAlign: "center",
    fontWeight: "600",
    fontFamily: "System",
    lineHeight: 30,
  },
  title: {
    color: strictlyColors.text,
    fontFamily: strictlyType.sansBold,
    fontWeight: "700",
    fontSize: 28,
    letterSpacing: -0.7,
    textAlign: "center",
  },
  subtitle: {
    color: strictlyColors.textSoft,
    fontFamily: strictlyType.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 310,
  },
  formContainer: {
    width: "100%",
    maxWidth: 420,
    marginTop: 24,
    padding: 16,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderRadius: strictlyRadius.large,
  },
  input: {
    width: "100%",
    height: 48,
    paddingHorizontal: 13,
    backgroundColor: strictlyColors.surface,
    borderRadius: strictlyRadius.small,
    marginTop: 10,
    color: strictlyColors.text,
    fontSize: 15,
    fontFamily: strictlyType.sans,
    borderWidth: 1,
    borderColor: strictlyColors.borderStrong,
  },
  button: {
    width: "100%",
    flexDirection: "row",
    height: 48,
    backgroundColor: strictlyColors.lime,
    borderRadius: strictlyRadius.small,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: strictlyColors.onLime,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: strictlyType.sansMedium,
  },
  forgotPasswordButton: {
    alignSelf: "center",
    marginTop: 2,
  },
  forgotPasswordText: {
    marginTop: 14,
    color: strictlyColors.textSoft,
    fontSize: 13,
    fontFamily: strictlyType.sans,
  },
  signUpContainer: {
    alignItems: "center",
    paddingVertical: 5, // Add vertical padding to the buttons
  },
  signUpText: {
    color: strictlyColors.textSoft,
    fontSize: 16,
    fontFamily: "System",
  },
  signUpLink: {
    color: strictlyColors.textSoft,
    fontWeight: "bold",
    fontFamily: "System",
    textDecorationLine: "underline",
  },
  errorContainer: {
    marginBottom: 10,
    backgroundColor: strictlyColors.dangerSurface,
    padding: 12,
    borderRadius: strictlyRadius.small,
    borderWidth: 1,
    borderColor: "#5C2E28",
  },
  errorText: {
    color: strictlyColors.danger,
    fontSize: 13,
    textAlign: "center",
    fontFamily: strictlyType.sans,
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: strictlyColors.border,
  },
  orText: {
    color: strictlyColors.textSoft,
    textAlign: "center",
    marginHorizontal: 10,
    fontFamily: strictlyType.sans,
    fontSize: 11,
  },
  appleButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: strictlyColors.surface,
    borderRadius: strictlyRadius.small,
    borderColor: strictlyColors.borderStrong,
    borderWidth: 1,
    height: 48,
  },
  noAccountButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderRadius: strictlyRadius.small,
    padding: 12,
    marginTop: 6,
  },
  NoAccountText: {
    color: strictlyColors.textSoft,
    fontWeight: "bold",
    fontFamily: strictlyType.sans,
    fontSize: 13,
  },
  NoAccountLink: {
    color: strictlyColors.textSoft,
    fontWeight: "bold",
    fontFamily: strictlyType.sans,
  },
  appleButtonText: {
    color: strictlyColors.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: strictlyType.sansMedium,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    backgroundColor: strictlyColors.surfaceMuted,
    borderRadius: strictlyRadius.small,
    padding: 3,
    marginBottom: 4,
  },
  toggleSlider: {
    position: "absolute",
    width: "30%",
    height: "100%",
    backgroundColor: "transparent",
    borderBottomWidth: 3,
    borderBottomColor: strictlyColors.borderStrong,
    bottom: 0,
    left: "27.5%",
  },
  toggleButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
  },
  toggleText: {
    fontSize: 13,
    color: strictlyColors.textSoft,
    fontFamily: strictlyType.sansMedium,
  },
  toggleActive: {
    color: strictlyColors.text,
    fontWeight: "600",
  },
});

export default SignInScreen;
