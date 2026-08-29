import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { NavigationProp } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { APPLE_SIGN_IN_ENABLED } from "../config/authFeatures";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

interface SignUpScreenProps {
  navigation: NavigationProp<any>;
}

type Field = "firstName" | "lastName" | "email" | "password" | "confirmPassword" | null;

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { signUpWithEmail, signUpWithApple } = useAuth();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<Field>(null);

  const lastNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const describeError = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Fill in every field to create your account.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Those passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUpWithEmail(email.trim(), password, firstName.trim(), lastName.trim());
      if (result.confirmationRequired) {
        navigation.navigate("VerifyEmail", { email: email.trim().toLowerCase() });
      } else {
        Alert.alert("You're in", "Your account is ready. Let's fuel the work.");
      }
    } catch (error) {
      setErrorMessage(describeError(error, "We couldn't create your account. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const onAppleButtonPress = async () => {
    setErrorMessage(null);
    try {
      await signUpWithApple();
      navigation.navigate("SignIn" as never);
    } catch (error) {
      setErrorMessage(describeError(error, "Apple sign-up didn't go through."));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                Save workouts, build repeatable meals, and learn what fuels your best sessions.
              </Text>

              <View style={styles.card}>
                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={15} color={strictlyColors.danger} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.label}>First name</Text>
                    <TextInput
                      style={[styles.input, focusedField === "firstName" && styles.inputFocused]}
                      placeholder="Alex"
                      placeholderTextColor={strictlyColors.textSoft}
                      value={firstName}
                      onChangeText={setFirstName}
                      onFocus={() => setFocusedField("firstName")}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="words"
                      textContentType="givenName"
                      returnKeyType="next"
                      onSubmitEditing={() => lastNameInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>Last name</Text>
                    <TextInput
                      ref={lastNameInputRef}
                      style={[styles.input, focusedField === "lastName" && styles.inputFocused]}
                      placeholder="Rivera"
                      placeholderTextColor={strictlyColors.textSoft}
                      value={lastName}
                      onChangeText={setLastName}
                      onFocus={() => setFocusedField("lastName")}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="words"
                      textContentType="familyName"
                      returnKeyType="next"
                      onSubmitEditing={() => emailInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  ref={emailInputRef}
                  style={[styles.input, focusedField === "email" && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor={strictlyColors.textSoft}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, focusedField === "password" && styles.inputFocused]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={strictlyColors.textSoft}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                  blurOnSubmit={false}
                />

                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={[styles.input, focusedField === "confirmPassword" && styles.inputFocused]}
                  placeholder="Type it again"
                  placeholderTextColor={strictlyColors.textSoft}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
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
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={strictlyColors.onLime} />
                  ) : (
                    <Text style={styles.buttonText}>Create account</Text>
                  )}
                </TouchableOpacity>

                {APPLE_SIGN_IN_ENABLED && (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={styles.appleButton} onPress={onAppleButtonPress} activeOpacity={0.85}>
                      <Ionicons name="logo-apple" size={18} color={strictlyColors.text} />
                      <Text style={styles.appleButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignIn" as never)} hitSlop={8}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: strictlyColors.background },
  flex: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingVertical: 40 },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 24 },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: strictlyColors.text,
    textAlign: "center",
    fontFamily: strictlyType.sansBold,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: strictlyColors.textSoft,
    fontFamily: strictlyType.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 320,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    marginTop: 28,
    padding: 20,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderRadius: strictlyRadius.xlarge,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: strictlyColors.dangerSurface,
    padding: 12,
    borderRadius: strictlyRadius.medium,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: strictlyColors.danger,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: strictlyType.sans,
  },

  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },

  label: {
    marginTop: 16,
    marginBottom: 6,
    color: strictlyColors.textSoft,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
    fontSize: 11.5,
    letterSpacing: 0.2,
  },

  input: {
    width: "100%",
    height: 50,
    paddingHorizontal: 14,
    backgroundColor: strictlyColors.surfaceMuted,
    borderRadius: strictlyRadius.medium,
    color: strictlyColors.fieldText,
    fontSize: 15,
    fontFamily: strictlyType.sans,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputFocused: {
    borderColor: strictlyColors.lime,
    backgroundColor: strictlyColors.surface,
  },

  button: {
    width: "100%",
    height: 50,
    backgroundColor: strictlyColors.lime,
    borderRadius: strictlyRadius.medium,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: {
    color: strictlyColors.onLime,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: strictlyType.sansMedium,
  },

  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: strictlyColors.border },
  dividerText: {
    color: strictlyColors.textSoft,
    marginHorizontal: 12,
    fontFamily: strictlyType.sans,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  appleButton: {
    width: "100%",
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: strictlyColors.surface,
    borderRadius: strictlyRadius.medium,
    borderColor: strictlyColors.borderStrong,
    borderWidth: 1,
  },
  appleButtonText: {
    color: strictlyColors.text,
    fontSize: 14.5,
    fontWeight: "600",
    fontFamily: strictlyType.sansMedium,
  },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 26 },
  footerText: {
    color: strictlyColors.textSoft,
    fontFamily: strictlyType.sans,
    fontSize: 13.5,
  },
  footerLink: {
    color: strictlyColors.accentText,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "700",
    fontSize: 13.5,
  },
});

export default SignUpScreen;
