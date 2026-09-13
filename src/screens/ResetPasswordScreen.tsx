import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { strictlyColors, strictlyRadius, strictlyType, semanticColors } from "../theme/strictlyTheme";

export default function ResetPasswordScreen() {
  const {
    updatePassword,
    resetPassword,
    errorMessage,
    clearError,
    passwordRecoveryReady,
    cancelPasswordRecovery,
  } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const save = async () => {
    clearError();
    if (password.length < 8) return Alert.alert("Password too short", "Use at least 8 characters.");
    if (password !== confirmation) return Alert.alert("Passwords do not match", "Enter the same password in both fields.");
    setSaving(true);
    try {
      await updatePassword(password);
      Alert.alert("Password updated", "Your password has been changed. You can continue using StrictlyFuel.");
    } catch { /* AuthContext exposes the friendly error below. */ }
    finally { setSaving(false); }
  };

  const sendAnotherLink = async () => {
    clearError();
    if (!email.trim() || !email.includes("@")) {
      return Alert.alert("Enter your email", "Enter the email address for your StrictlyFuel account.");
    }
    setSaving(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch { /* AuthContext exposes the friendly error below. */ }
    finally { setSaving(false); }
  };

  if (!passwordRecoveryReady) {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>ACCOUNT SECURITY</Text>
          <Text style={styles.title}>{resetSent ? "Check your email" : "Reset link expired"}</Text>
          <Text style={styles.subtitle}>
            {resetSent
              ? "We sent a fresh password reset link. For security, open the newest email and use it only once."
              : "That link is invalid, expired, or has already been used. Enter your email to receive a new one."}
          </Text>
          <View style={styles.card}>
            {!resetSent ? (
              <>
                <Text style={styles.label}>Email address</Text>
                <TextInput value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" placeholder="you@example.com" placeholderTextColor={semanticColors.textMuted} />
                {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
                <TouchableOpacity disabled={saving} onPress={sendAnotherLink} style={[styles.button, saving && styles.disabled]}>
                  <Text style={styles.buttonText}>{saving ? "Sending…" : "Send a new reset link"}</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity onPress={cancelPasswordRecovery} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>ACCOUNT SECURITY</Text>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>Choose a new password for your StrictlyFuel account.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>New password</Text>
          <TextInput value={password} onChangeText={setPassword} style={styles.input} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="password-new" placeholder="At least 8 characters" placeholderTextColor={semanticColors.textMuted} />
          <Text style={styles.label}>Confirm password</Text>
          <TextInput value={confirmation} onChangeText={setConfirmation} style={styles.input} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="password-new" placeholder="Enter it again" placeholderTextColor={semanticColors.textMuted} />
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <TouchableOpacity disabled={saving} onPress={save} style={[styles.button, saving && styles.disabled]}>
            <Text style={styles.buttonText}>{saving ? "Updating…" : "Update password"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: strictlyColors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  kicker: { color: semanticColors.textMuted, fontFamily: strictlyType.mono, letterSpacing: 0.3, fontSize: 12, marginBottom: 12 },
  title: { color: strictlyColors.text, fontFamily: strictlyType.sans, fontWeight: "700", fontSize: 34, marginBottom: 10 },
  subtitle: { color: semanticColors.textMuted, fontFamily: strictlyType.sans, fontSize: 16, lineHeight: 24, marginBottom: 28 },
  card: { backgroundColor: strictlyColors.surface, borderRadius: strictlyRadius.xlarge, padding: 20 },
  label: { color: semanticColors.textMuted, fontFamily: strictlyType.sansMedium, fontSize: 13, marginBottom: 8, marginTop: 10 },
  input: { color: strictlyColors.fieldText, backgroundColor: strictlyColors.surfaceMuted, borderRadius: strictlyRadius.large, paddingHorizontal: 14, height: 52, fontSize: 16 },
  error: { color: "#F28B72", marginTop: 12, lineHeight: 20 },
  button: { backgroundColor: strictlyColors.lime, borderRadius: strictlyRadius.pill, height: 54, alignItems: "center", justifyContent: "center", marginTop: 22 },
  disabled: { opacity: 0.6 },
  buttonText: { color: strictlyColors.ink, fontFamily: strictlyType.sans, fontWeight: "700", fontSize: 16 },
  secondaryButton: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryButtonText: { color: strictlyColors.text, fontFamily: strictlyType.sans, fontWeight: "700", fontSize: 15 },
});
