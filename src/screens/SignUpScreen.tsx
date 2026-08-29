import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { NavigationProp } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { APPLE_SIGN_IN_ENABLED } from "../config/authFeatures";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

interface SignUpScreenProps {
  navigation: NavigationProp<any>;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { signUpWithEmail, signUpWithApple } = useAuth();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [togglePosition] = useState(new Animated.Value(1));

  const lastNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const screenWidth = Dimensions.get("window").width;
  const toggleWidth = (screenWidth - 60) / 2;

  const animateToggle = (toValue: number) => {
    if (toValue === 0) {
      setTimeout(() => navigation.navigate("SignIn"), 300); // Delay navigation slightly
    }
    Animated.spring(togglePosition, {
      toValue,
      useNativeDriver: true,
      bounciness: 6,
      speed: 8,
    }).start();
  };

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setErrorMessage("Please fill all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUpWithEmail(email, password, firstName, lastName);
      if (result.confirmationRequired) {
        navigation.navigate("VerifyEmail", { email: email.trim().toLowerCase() });
      } else {
        Alert.alert(
          "You’re in",
          "Your account is ready. Let’s fuel the work.",
          [{ text: "Continue" }]
        );
      }
    } catch (error: any) {
      let msg = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case "auth/email-already-in-use":
            msg = "This email is already associated with an account.";
            break;
          case "auth/invalid-email":
            msg = "Invalid email address. Please check the format.";
            break;
          case "auth/weak-password":
            msg =
              "Your password is too weak. Please choose a stronger password.";
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

  const onAppleButtonPress = async () => {
    try {
      await signUpWithApple();
      navigation.navigate("SignIn");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // Adjust based on your app's header
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Save workouts, build repeatable meals, and learn what fuels your best sessions.</Text>

              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => animateToggle(0)}
                >
                  <Text style={styles.toggleText}>Sign in</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleButton, styles.toggleButtonActive]}
                  onPress={() => animateToggle(1)}
                >
                  <Text
                    style={[styles.toggleText, styles.toggleActive]}
                  >
                    Create account
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                {errorMessage && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <View style={styles.nameContainer}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="First Name"
                    placeholderTextColor={strictlyColors.textSoft}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    textContentType="givenName"
                    returnKeyType="next"
                    onSubmitEditing={() => lastNameInputRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <TextInput
                    ref={lastNameInputRef}
                    style={[styles.input, styles.halfInput]}
                    placeholder="Last Name"
                    placeholderTextColor={strictlyColors.textSoft}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    textContentType="familyName"
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>

                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
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
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={strictlyColors.textSoft}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    confirmPasswordInputRef.current?.focus()
                  }
                  blurOnSubmit={false}
                />
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={strictlyColors.textSoft}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSignUp}
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
                      onPress={onAppleButtonPress}
                    >
                      <Ionicons name="logo-apple" size={20} color={strictlyColors.text} />
                      <Text style={styles.appleButtonText}>
                        Sign up with Apple
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: strictlyColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 28,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 150,
    height: 120,
    marginBottom: 6,
    resizeMode: "contain",
  },
  titleContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 27,
    fontWeight: "700",
    color: strictlyColors.text,
    textAlign: "center",
    fontFamily: strictlyType.sansBold,
    letterSpacing: -0.7,
  },
  subtitle: {
    color: strictlyColors.textSoft,
    fontFamily: strictlyType.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 330,
  },
  formContainer: {
    width: "100%",
    maxWidth: 440,
    marginTop: 4,
    padding: 16,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderRadius: strictlyRadius.large,
  },
  nameContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  halfInput: {
    width: "48%",
    marginTop: -0,
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
  footer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  signInContainer: {
    marginTop: -10,
    alignItems: "center",
  },
  signInText: {
    color: strictlyColors.textSoft,
    fontSize: 16,
    fontFamily: "System",
  },
  signInLink: {
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
  keyboardAvoidingView: {
    flex: 1,
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: strictlyColors.surface,
    borderRadius: strictlyRadius.small,
    borderColor: strictlyColors.borderStrong,
    borderWidth: 1,
    height: 48,
    width: "100%",
  },
  appleButtonText: {
    color: strictlyColors.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: strictlyType.sansMedium,
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
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    maxWidth: 440,
    backgroundColor: strictlyColors.surfaceMuted,
    borderRadius: strictlyRadius.small,
    padding: 3,
    marginTop: 24,
    marginBottom: 8,
  },
  toggleSlider: {
    position: "absolute",
    width: "30%",
    height: "100%",
    backgroundColor: "transparent",
    borderBottomWidth: 3,
    borderBottomColor: strictlyColors.borderStrong,
    bottom: 0,
    left: "30%",
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

export default SignUpScreen;
