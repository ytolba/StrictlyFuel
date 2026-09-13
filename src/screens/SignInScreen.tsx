import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { APPLE_SIGN_IN_ENABLED } from "../config/authFeatures";
import { StrictlyMark } from "../components/StrictlyBrand";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type Field = "email" | "password" | null;

const SignInScreen: React.FC = () => {
  const { signInWithEmail, resetPassword, signInWithApple } = useAuth();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<Field>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const describeError = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const handleEmailSignIn = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage("Enter your email and password to continue.");
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (error) {
      setErrorMessage(describeError(error, "We couldn't sign you in. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage("Enter your email above first, then request a reset link.");
      return;
    }
    setIsForgotLoading(true);
    try {
      await resetPassword(email.trim());
      Alert.alert("Check your email", "A password reset link is on its way.");
    } catch (error) {
      const message = describeError(error, "Please try again in a moment.");
      const rateLimited = /too many reset emails|wait about an hour/i.test(message);
      Alert.alert(rateLimited ? "Reset email already sent" : "Couldn't send reset link", message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (error) {
      setErrorMessage(describeError(error, "Apple sign-in didn't go through."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.markWrap}>
              <StrictlyMark size={30} />
            </View>

            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Your workouts, fuel targets and meals stay together here.</Text>

            <View style={styles.card}>
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={15} color={strictlyColors.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
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

              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} disabled={isForgotLoading} hitSlop={8}>
                  {isForgotLoading ? (
                    <ActivityIndicator size="small" color={strictlyColors.textSoft} />
                  ) : (
                    <Text style={styles.inlineLink}>Forgot password?</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, focusedField === "password" && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor={strictlyColors.textSoft}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
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
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={strictlyColors.onLime} />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>

              {APPLE_SIGN_IN_ENABLED && (
                <>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-apple" size={18} color={strictlyColors.text} />
                    <Text style={styles.appleButtonText}>Continue with Apple</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New to StrictlyFuel? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("SignUp" as never)} hitSlop={8}>
                <Text style={styles.footerLink}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: strictlyColors.background },
  flex: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingVertical: 40 },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 24 },

  markWrap: {
    width: 56,
    height: 56,
    borderRadius: strictlyRadius.large,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  title: {
    color: strictlyColors.text,
    fontFamily: strictlyType.sansBold,
    fontWeight: "700",
    fontSize: 26,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  subtitle: {
    color: strictlyColors.textSoft,
    fontFamily: strictlyType.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 300,
  },

  card: {
    width: "100%",
    maxWidth: 400,
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

  labelRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    marginTop: 16,
    marginBottom: 6,
    color: strictlyColors.textSoft,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  inlineLink: {
    color: strictlyColors.accentText,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
    fontSize: 11.5,
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

export default SignInScreen;
