import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
  Modal,
  Linking,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

import { useRevenueCat } from "../provider/RevenuCatProvider";
import { StrictlyBrand } from "../components/StrictlyBrand";
import { NutritionProfileForm } from "../components/NutritionProfileForm";
import { loadNutritionProfile, saveNutritionProfile } from "../services/nutritionProfileService";
import { EMPTY_NUTRITION_PROFILE, NutritionProfile, hasNutritionPreferences } from "../types/nutritionProfile";
import { describeProfile } from "../utils/nutritionScore";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

const AccountScreen = () => {
  const { user: authUser, signOut } = useAuth();

  const {
    user: rcUser,
    isPro,
    packages,
    purchasePackage,
    restorePermissions,
    presentCustomerCenter,
  } = useRevenueCat();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (authUser?.uid) {
        const userRef = doc(db, "users", authUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFirstName(data?.firstName || "");
          setLastName(data?.lastName || "");
        }
      }
    };
    fetchUserData();
    console.log(packages);
    console.log(authUser);
  }, [authUser, packages]);

  useEffect(() => {
    loadNutritionProfile().then(setNutritionProfile);
  }, []);

  const handleSaveNutritionProfile = async () => {
    const saved = await saveNutritionProfile(nutritionProfile);
    setNutritionProfile(saved);
    setShowProfileModal(false);
  };

  const fullName = `${firstName} ${lastName}`;

  // Purchase a package by calling purchasePackage from RevenueCat
  const handleSubscribe = async (packId: string) => {
    try {
      if (!purchasePackage) {
        Alert.alert("Error", "Purchases are not available.");
        return;
      }

      const pack = packages.find((p) => p.identifier === packId);
      if (!pack) {
        Alert.alert("Error", `Package not found.`);
        return;
      }

      const result = await purchasePackage(pack);

      if (result.success && result.customerInfo?.entitlements?.active?.pro) {
        if (authUser?.uid) {
          const userRef = doc(db, "users", authUser.uid);
          await updateDoc(userRef, { premium: true });
        }
        Alert.alert("Success", "Premium features activated!");
      } else if (result.error === "cancelled") {
        // Don't show alert for user cancellation
        return;
      } else {
        Alert.alert("Error", "Subscription failed. Please try again.");
      }
    } catch (error) {
      console.error("Subscription Error:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };
  const handleCreateAccount = async () => {
    try {
      // Handle account creation (e.g., collect email and password, sign up the user)
      // After creating the account, you can sign the user in and update their details.
      if (authUser?.uid) await deleteDoc(doc(db, "users", authUser.uid));
      signOut();
    } catch (error) {
      console.error("Error creating account:", error);
    }
  };

  // Restore Purchases
  const handleRestore = async () => {
    try {
      // Ensure restorePermissions is defined
      if (!restorePermissions) {
        Alert.alert("Error", "Restore is not available.");
        return;
      }

      const restoredCustomerInfo = await restorePermissions();
      // If restore succeeds and user has entitlements:
      if (authUser?.uid && restoredCustomerInfo) {
        const userRef = doc(db, "users", authUser.uid);
        await updateDoc(userRef, { premium: rcUser.pro });
      }
      Alert.alert("Success", "Your purchases have been restored.");
    } catch (error) {
      Alert.alert("Error", "Failed to restore purchases.");
      console.error("Restore Error:", error);
    }
  };

  /**
   * RevenueCat Customer Center. It handles cancellations, plan changes, refund
   * requests, subscription status and win-back offers without us building any
   * of those screens — and it is configured from the RevenueCat dashboard, so
   * the copy can change without an app release. When the native UI package is
   * not linked (Expo Go, an older dev client) we send the customer to Apple's
   * own subscription settings instead.
   */
  const handleManageSubscription = async () => {
    const opened = await presentCustomerCenter();
    if (!opened) await handleOpenLink("https://apps.apple.com/account/subscriptions");
  };

  // Open external links
  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Unable to open the link.");
      }
    } catch (error) {
      console.error("Error opening link:", error);
    }
  };

  // Account deletion
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            if (authUser?.uid) {
              try {
                await deleteDoc(doc(db, "users", authUser.uid));
                signOut();
                Alert.alert(
                  "Account Deleted",
                  "Your account has been deleted."
                );
              } catch (error) {
                console.error("Delete Account Error:", error);
                Alert.alert("Error", "Failed to delete account.");
              }
            }
          },
        },
      ]
    );
  };

  const displayName = fullName.trim() || "Strictly member";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");
  const isAnonymous = Boolean(auth.currentUser?.isAnonymous);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>ACCOUNT</Text>
            <Text style={styles.pageTitle}>Your profile</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
            onPress={() => setShowSettingsModal(true)}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={21} color={strictlyColors.text} />
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials || "S"}</Text></View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{authUser?.email || "Guest mode"}</Text>
            </View>
            <View style={[styles.statusPill, rcUser.pro && styles.statusPillPro]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{rcUser.pro ? "PRO" : "FREE"}</Text>
            </View>
          </View>
          <View style={styles.profileDivider} />
          <View style={styles.profileFooter}>
            <StrictlyBrand size={25} dark={false} compact />
            <Text style={styles.memberSince}>{isAnonymous ? "Browsing as guest" : "Member account"}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Personalization</Text>
        <TouchableOpacity style={styles.personalizationCard} onPress={() => setShowProfileModal(true)}>
          <View style={styles.personalizationIcon}>
            <Ionicons name="options-outline" size={21} color={strictlyColors.text} />
          </View>
          <View style={styles.personalizationCopy}>
            <Text style={styles.personalizationTitle}>Your food profile</Text>
            <Text style={styles.personalizationDetail} numberOfLines={2}>
              {hasNutritionPreferences(nutritionProfile)
                ? describeProfile(nutritionProfile).slice(0, 4).join(" · ")
                : "Add sensitivities, diet-related conditions, values, and priorities."}
            </Text>
          </View>
          <View style={styles.personalizationStatus}>
            <View style={[styles.personalizationDot, hasNutritionPreferences(nutritionProfile) && styles.personalizationDotActive]} />
            <Ionicons name="arrow-forward" size={17} color={strictlyColors.textSoft} />
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{rcUser.pro ? "You’re on Pro" : "Upgrade your experience"}</Text>
          <Text style={styles.sectionSubtitle}>
            {isAnonymous
              ? "Create an account to save scans and unlock Pro."
              : rcUser.pro
              ? "Your premium tools are ready whenever you are."
              : "Get deeper ingredient analysis and more saved scans."}
          </Text>
        </View>

        {!rcUser.pro && !isAnonymous ? (
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionIcon}><Ionicons name="sparkles" size={22} color={strictlyColors.text} /></View>
            <View style={styles.subscriptionCopy}>
              <Text style={styles.subscriptionTitle}>Strictly Pro</Text>
              <Text style={styles.subscriptionDetail}>More scans, deeper insights, less guesswork.</Text>
            </View>
            {packages.length > 0 ? packages.map((pack) => (
              <TouchableOpacity key={pack.identifier} style={styles.upgradeButton} onPress={() => handleSubscribe(pack.identifier)}>
                <Text style={styles.upgradeButtonText}>{pack.product.pricePerMonthString}/mo</Text>
                <Ionicons name="arrow-forward" size={18} color={strictlyColors.text} />
              </TouchableOpacity>
            )) : (
              <Text style={styles.unavailableText}>Plans loading…</Text>
            )}
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
              <Text style={styles.restoreButtonText}>Restore purchases</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.proCard}>
            <View style={styles.proCardRow}>
              <View style={styles.proBadge}><Ionicons name="checkmark" size={17} color={strictlyColors.text} /></View>
              <View style={styles.subscriptionCopy}>
                <Text style={styles.subscriptionTitle}>{isAnonymous ? "Save your progress" : "Pro is active"}</Text>
                <Text style={styles.subscriptionDetail}>{isAnonymous ? "Create your account to keep scans across devices." : "You have access to all current Pro features."}</Text>
              </View>
            </View>
            {isPro ? (
              <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
                <Ionicons name="settings-outline" size={17} color={strictlyColors.text} />
                <Text style={styles.manageButtonText}>Manage subscription</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <Text style={styles.sectionLabel}>Stay connected</Text>
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleOpenLink("https://www.instagram.com/strictlybased/")}>
            <Ionicons name="logo-instagram" size={20} color={strictlyColors.text} />
            <Text style={styles.socialButtonText}>Instagram</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleOpenLink("https://www.tiktok.com/@strictlybased")}>
            <Ionicons name="logo-tiktok" size={20} color={strictlyColors.text} />
            <Text style={styles.socialButtonText}>TikTok</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.brandFooter}>
          <StrictlyBrand size={30} dark={false} />
          <Text style={styles.brandFooterText}>CLEAN INGREDIENTS. REAL NUTRITION.</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <SafeAreaView style={styles.profileModalSafeArea}>
          <View style={styles.profileModalHeader}>
            <TouchableOpacity style={styles.profileModalClose} onPress={() => setShowProfileModal(false)}>
              <Ionicons name="close" size={20} color={strictlyColors.text} />
            </TouchableOpacity>
            <View style={styles.profileModalHeading}>
              <Text style={styles.profileModalKicker}>PERSONALIZATION</Text>
              <Text style={styles.profileModalTitle}>Your food profile</Text>
            </View>
            <View style={styles.profileModalClosePlaceholder} />
          </View>
          <ScrollView contentContainerStyle={styles.profileModalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.profileModalIntro}>
              Your selections change “Fit for you,” while ingredient quality and processing remain consistent for everyone.
            </Text>
            <NutritionProfileForm profile={nutritionProfile} onChange={setNutritionProfile} />
            <View style={styles.profilePrivacyCard}>
              <Ionicons name="lock-closed-outline" size={17} color={strictlyColors.good} />
              <Text style={styles.profilePrivacyText}>Stored on this device. Informational only—not medical advice.</Text>
            </View>
          </ScrollView>
          <View style={styles.profileModalFooter}>
            <TouchableOpacity style={styles.profileSaveButton} onPress={handleSaveNutritionProfile}>
              <Text style={styles.profileSaveText}>Save profile</Text>
              <Ionicons name="checkmark" size={17} color={strictlyColors.paper} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={
                auth.currentUser?.isAnonymous
                  ? handleCreateAccount
                  : handleDeleteAccount
              }
            >
              <Text style={styles.modalButtonText}>
                {auth.currentUser?.isAnonymous
                  ? "Make Account"
                  : "Delete Account"}
              </Text>
            </TouchableOpacity>
            {!auth.currentUser?.isAnonymous && (
              <TouchableOpacity style={styles.modalButton} onPress={signOut}>
                <Text style={styles.modalButtonText}>Log Out</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AccountScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: strictlyColors.background },
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 118,
    backgroundColor: strictlyColors.background,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  kicker: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 10, letterSpacing: 1.2, marginBottom: 5 },
  pageTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 30, letterSpacing: -0.9 },
  profileCard: { backgroundColor: strictlyColors.black, borderRadius: strictlyRadius.large, padding: 20, marginBottom: 28 },
  profileTopRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  avatarText: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 18 },
  profileCopy: { flex: 1, marginLeft: 13 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: strictlyRadius.pill, backgroundColor: "rgba(251,249,245,0.13)" },
  statusPillPro: { backgroundColor: strictlyColors.lime },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: strictlyColors.sage },
  statusText: { color: strictlyColors.white, fontFamily: strictlyType.mono, fontWeight: "600", fontSize: 9, letterSpacing: 0.8 },
  profileDivider: { height: 1, backgroundColor: "rgba(251,249,245,0.16)", marginVertical: 18 },
  profileFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  memberSince: { color: "#A1A1A1", fontFamily: strictlyType.sans, fontSize: 12 },
  sectionHeading: { marginBottom: 15 },
  sectionTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "600", fontSize: 20, letterSpacing: -0.4 },
  sectionSubtitle: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 14, lineHeight: 20, marginTop: 5 },
  subscriptionCard: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, padding: 17, marginBottom: 28 },
  personalizationCard: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, padding: 16, marginBottom: 28 },
  personalizationIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.lime },
  personalizationCopy: { flex: 1 },
  personalizationTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 15 },
  personalizationDetail: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 12, lineHeight: 17, marginTop: 4 },
  personalizationStatus: { flexDirection: "row", alignItems: "center", gap: 7 },
  personalizationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: strictlyColors.borderStrong },
  personalizationDotActive: { backgroundColor: strictlyColors.good },
  subscriptionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  subscriptionCopy: { flex: 1 },
  subscriptionTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 16 },
  subscriptionDetail: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 13, lineHeight: 18, marginTop: 4 },
  unavailableText: { color: strictlyColors.muted, fontFamily: "System", fontSize: 13, marginTop: 14 },
  restoreButton: { alignItems: "center", paddingTop: 15 },
  restoreButtonText: { color: strictlyColors.good, fontFamily: "System", fontSize: 12, textDecorationLine: "underline" },
  proCard: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, padding: 17, marginBottom: 28 },
  proCardRow: { flexDirection: "row", alignItems: "center" },
  manageButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, marginTop: 14, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.surfaceMuted },
  manageButtonText: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "700", fontSize: 13 },
  proBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center", marginRight: 13 },
  sectionLabel: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 10, letterSpacing: 1, marginBottom: 10 },
  socialRow: { flexDirection: "row", gap: 10, marginBottom: 36 },
  brandFooter: { alignItems: "center", paddingTop: 18, borderTopWidth: 1, borderTopColor: strictlyColors.line },
  brandFooterText: { color: strictlyColors.sage, fontFamily: "System", fontSize: 8, letterSpacing: 1.4, marginTop: 9 },
  brandCard: {
    minHeight: 120,
    padding: 20,
    borderRadius: strictlyRadius.large,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    justifyContent: "space-between",
  },
  brandEyebrow: {
    color: strictlyColors.good,
    fontFamily: "System",
    fontSize: 9,
    letterSpacing: 1.8,
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  profileName: {
    fontSize: 17,
    color: strictlyColors.white,
    fontFamily: strictlyType.sansMedium,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 12,
    color: "#A1A1A1",
    marginTop: 4,
    fontFamily: strictlyType.sans,
  },
  featureText: {
    fontSize: 18,
    color: strictlyColors.muted,
    marginVertical: 20,
    textAlign: "center",
    fontFamily: "System",
    lineHeight: 25,
  },
  upgradeButton: {
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 15,
    backgroundColor: strictlyColors.lime,
    borderRadius: strictlyRadius.small,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  upgradeButtonText: {
    color: strictlyColors.text,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: strictlyType.sansMedium,
  },
  contactButton: {
    padding: 15,
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderRadius: strictlyRadius.pill,
    alignItems: "center",
    marginBottom: 20,
  },
  contactButtonText: {
    color: strictlyColors.text,
    fontSize: 16,
    fontFamily: "System",
    fontWeight: "600",
  },
  socialContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: strictlyRadius.small,
    flex: 1,
    justifyContent: "center",
    gap: 7,
  },
  socialButtonText: {
    color: strictlyColors.text,
    fontSize: 13,
    fontWeight: "500",
    fontFamily: strictlyType.sansMedium,
    marginLeft: 0,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: strictlyRadius.small,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
  },
  settingsButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: strictlyColors.surface,
    borderWidth: 1,
    borderColor: strictlyColors.border,
    borderRadius: strictlyRadius.large,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: strictlyColors.text,
    fontFamily: strictlyType.sansBold,
    marginBottom: 20,
  },
  modalButton: {
    width: "100%",
    padding: 15,
    backgroundColor: strictlyColors.clay,
    borderRadius: strictlyRadius.pill,
    alignItems: "center",
    marginVertical: 10,
  },
  modalButtonText: {
    color: strictlyColors.paper,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "System",
  },
  modalCloseButton: {
    width: "100%",
    padding: 15,
    backgroundColor: strictlyColors.ink,
    borderRadius: strictlyRadius.pill,
    alignItems: "center",
    marginVertical: 10,
  },
  modalCloseButtonText: {
    color: strictlyColors.lime,
    fontSize: 16,
    fontWeight: "bold",
  },
  profileModalSafeArea: { flex: 1, backgroundColor: strictlyColors.background },
  profileModalHeader: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  profileModalClose: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.small, backgroundColor: strictlyColors.surface },
  profileModalClosePlaceholder: { width: 38 },
  profileModalHeading: { flex: 1, alignItems: "center" },
  profileModalKicker: { color: strictlyColors.good, fontFamily: strictlyType.mono, fontSize: 8, letterSpacing: 1 },
  profileModalTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 17, marginTop: 3 },
  profileModalContent: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 28 },
  profileModalIntro: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 14, lineHeight: 20, marginBottom: 26 },
  profilePrivacyCard: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 14, backgroundColor: strictlyColors.cream, borderRadius: strictlyRadius.medium },
  profilePrivacyText: { flex: 1, color: strictlyColors.text, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 16 },
  profileModalFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: strictlyColors.border },
  profileSaveButton: { minHeight: 49, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: strictlyColors.ink, borderRadius: strictlyRadius.small },
  profileSaveText: { color: strictlyColors.paper, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 14 },
});
