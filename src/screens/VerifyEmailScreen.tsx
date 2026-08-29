import React, { useRef, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuth } from "../contexts/AuthContext";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

const RESEND_SECONDS = 30;
export default function VerifyEmailScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<any>();
  const email: string = route.params?.email || "your inbox";
  const { resendSignUpCode } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const resend = async () => {
    setSending(true); setMessage("");
    try {
      await resendSignUpCode(email);
      setMessage("A fresh confirmation email is on the way.");
      setCooldown(RESEND_SECONDS);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => setCooldown((value) => { if (value <= 1) { if (timer.current) clearInterval(timer.current); return 0; } return value - 1; }), 1000);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn’t resend the email yet."); }
    finally { setSending(false); }
  };

  return <SafeAreaView style={styles.safe}><View style={styles.container}>
    <Image source={require("../../assets/branding/strictly-lockup.png")} style={styles.logo} />
    <View style={styles.icon}><Ionicons name="mail-unread-outline" size={34} color={strictlyColors.lime} /></View>
    <Text style={styles.eyebrow}>ONE LAST STEP</Text>
    <Text style={styles.title}>Check your email.</Text>
    <Text style={styles.subtitle}>We sent a confirmation link to <Text style={styles.email}>{email}</Text>. Tap it and your phone will return directly to StrictlyFuel.</Text>
    <View style={styles.tip}><Ionicons name="phone-portrait-outline" size={19} color={strictlyColors.text} /><Text style={styles.tipText}>If the app is already open, the confirmation link will finish the session automatically. Otherwise, come back and sign in.</Text></View>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate("SignIn")}><Text style={styles.primaryText}>I confirmed my email</Text><Ionicons name="arrow-forward" size={18} color={strictlyColors.onLime} /></TouchableOpacity>
    <TouchableOpacity style={styles.resend} disabled={sending || cooldown > 0} onPress={resend}>{sending ? <ActivityIndicator color={strictlyColors.text} /> : <Text style={styles.resendText}>{cooldown ? `Resend in ${cooldown}s` : "Resend confirmation email"}</Text>}</TouchableOpacity>
    <Text style={styles.note}>The confirmation link now opens StrictlyFuel directly instead of sending you to a browser page.</Text>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: strictlyColors.background }, container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }, logo: { width: 135, height: 90, resizeMode: "contain", marginBottom: 14 }, icon: { width: 76, height: 76, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.ink }, eyebrow: { marginTop: 23, fontFamily: strictlyType.mono, color: strictlyColors.good, fontSize: 8, letterSpacing: 1.3 }, title: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.text, fontSize: 31, letterSpacing: -1, marginTop: 7 }, subtitle: { maxWidth: 350, textAlign: "center", fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 14, lineHeight: 21, marginTop: 9 }, email: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "700" },
  tip: { width: "100%", maxWidth: 430, flexDirection: "row", gap: 10, padding: 14, marginTop: 22, borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.cream }, tipText: { flex: 1, fontFamily: strictlyType.sans, color: strictlyColors.text, fontSize: 11, lineHeight: 17 }, message: { marginTop: 12, fontFamily: strictlyType.sansMedium, color: strictlyColors.good, fontSize: 11, textAlign: "center" },
  primary: { width: "100%", maxWidth: 430, height: 54, marginTop: 16, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }, primaryText: { fontFamily: strictlyType.sansMedium, fontWeight: "900", color: strictlyColors.onLime, fontSize: 13 }, resend: { height: 48, alignItems: "center", justifyContent: "center" }, resendText: { fontFamily: strictlyType.sansMedium, fontWeight: "700", color: strictlyColors.text, fontSize: 12 }, note: { maxWidth: 330, textAlign: "center", fontFamily: strictlyType.sans, color: strictlyColors.textSoft, fontSize: 9, lineHeight: 14 },
});
