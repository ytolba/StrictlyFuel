import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { APPLE_SIGN_IN_ENABLED } from "../config/authFeatures";
import { loadNutritionProfile } from "../services/nutritionProfileService";

export interface User {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  createdAt: string;
  lastLogin: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  errorMessage: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string) => Promise<{ confirmationRequired: boolean }>;
  verifySignUpCode: (email: string, token: string) => Promise<void>;
  resendSignUpCode: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  deleteAccount: () => Promise<void>;
  continueWithoutAccount: () => Promise<void>;
  signInWithApple: () => Promise<User | null>;
  signUpWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_CALLBACK_URL = "strictlyfuel://auth/callback";

async function applyAuthCallback(url: string) {
  if (!url.startsWith(AUTH_CALLBACK_URL) && !url.startsWith("strictlyfuel://reset-password")) return;
  const payload = url.includes("#") ? url.split("#")[1] : url.split("?")[1] || "";
  const params = new URLSearchParams(payload);
  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
  }
}

const messageFor = (error: unknown) => {
  const raw = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  if (/invalid login credentials/i.test(raw)) return "That email and password do not match.";
  if (/email not confirmed/i.test(raw)) return "Check your inbox and confirm your email before signing in.";
  if (/already registered|already been registered|user already exists/i.test(raw)) return "An account already exists for that email.";
  if (/password/i.test(raw) && /6 characters/i.test(raw)) return "Use a password with at least 6 characters.";
  if (/token has expired|invalid otp|token is invalid/i.test(raw)) return "That code is incorrect or has expired. Request a new one and try again.";
  if (/for security purposes|rate limit/i.test(raw)) return "Please wait a moment before requesting another code.";
  return raw;
};

const mapUser = (source: SupabaseUser): User => {
  const metadata = source.user_metadata || {};
  const fullName = String(metadata.full_name || metadata.name || "").trim().split(/\s+/);
  return {
    uid: source.id,
    email: source.email || (source.is_anonymous ? "Guest athlete" : ""),
    firstName: metadata.first_name || metadata.given_name || fullName[0] || (source.is_anonymous ? "Guest" : "Athlete"),
    lastName: metadata.last_name || metadata.family_name || fullName.slice(1).join(" "),
    picture: metadata.avatar_url || "",
    createdAt: source.created_at || new Date().toISOString(),
    lastLogin: source.last_sign_in_at || new Date().toISOString(),
    isGuest: Boolean(source.is_anonymous),
  };
};

async function syncFuelPreferences(userId: string) {
  const profile = await loadNutritionProfile();
  const { error } = await supabase.from("user_fuel_preferences").upsert({
    user_id: userId,
    sensitivities: profile.sensitivities,
    allergies: profile.conditions,
    dietary_patterns: profile.dietaryPatterns,
    avoid_foods: profile.priorities,
    body_weight_kg: profile.bodyWeightKg,
    height_cm: profile.heightCm,
    units: profile.measurementSystem,
    health_insights_enabled: profile.healthInsightsEnabled,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn("Fuel preference sync was skipped", error.message);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = () => setErrorMessage(null);
  const fail = (error: unknown): never => {
    const message = messageFor(error);
    setErrorMessage(message);
    throw new Error(message);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ? mapUser(data.session.user) : null);
      setLoading(false);
    }).catch(() => mounted && setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const next = session?.user ? mapUser(session.user) : null;
      setUser(next);
      setLoading(false);
      if (next && !next.isGuest) setTimeout(() => syncFuelPreferences(next.uid).catch(() => undefined), 0);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) applyAuthCallback(url).catch((error) => setErrorMessage(messageFor(error)));
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      applyAuthCallback(url).catch((error) => setErrorMessage(messageFor(error)));
    });
    return () => subscription.remove();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      clearError();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
    } catch (error) { fail(error); }
  };

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      clearError();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: AUTH_CALLBACK_URL,
          data: { first_name: firstName.trim(), last_name: lastName.trim(), display_name: `${firstName} ${lastName}`.trim() },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Your account could not be created.");
      if (data.user.identities?.length === 0) throw new Error("An account already exists for that email.");
      return { confirmationRequired: !data.session };
    } catch (error) { return fail(error); }
  };

  const verifySignUpCode = async (email: string, token: string) => {
    try {
      clearError();
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: "signup" });
      if (error) throw error;
    } catch (error) { fail(error); }
  };

  const resendSignUpCode = async (email: string) => {
    try {
      clearError();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: AUTH_CALLBACK_URL },
      });
      if (error) throw error;
    } catch (error) { fail(error); }
  };

  const resetPassword = async (email: string) => {
    try {
      clearError();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: "strictlyfuel://reset-password" });
      if (error) throw error;
    } catch (error) { fail(error); }
  };

  const signOut = async () => {
    clearError();
    const { error } = await supabase.auth.signOut();
    if (error) fail(error);
    setUser(null);
  };

  const continueWithoutAccount = async () => {
    try {
      clearError();
      const { error } = await supabase.auth.signInAnonymously({ options: { data: { first_name: "Guest" } } });
      if (error) throw error;
    } catch {
      fail(new Error("Guest access is unavailable right now. Create a free account to continue."));
    }
  };

  const signInWithApple = async () => {
    if (!APPLE_SIGN_IN_ENABLED) throw new Error("Apple Sign In is temporarily disabled.");
    try {
      clearError();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error("Apple did not return a valid sign-in token.");
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: credential.identityToken });
      if (error) throw error;
      return data.user ? mapUser(data.user) : null;
    } catch (error) { return fail(error); }
  };

  const deleteAccount = async () => {
    if (!user) return;
    // Handled server-side by the delete-account edge function, which resolves
    // the caller from their own JWT and cascades the delete across their data.
    const { data, error } = await supabase.functions.invoke("delete-account");
    if (error || !data?.deleted) {
      Alert.alert(
        "We couldn’t delete the account",
        error?.message || "Something went wrong on our side. Please try again, or contact support if it keeps happening."
      );
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    Alert.alert("Account deleted", "Your account and its data have been removed.");
  };

  const value = useMemo<AuthContextType>(() => ({
    user, loading, errorMessage, signInWithEmail, signOut, signUpWithEmail, verifySignUpCode, resendSignUpCode, resetPassword,
    clearError, deleteAccount, continueWithoutAccount, signInWithApple,
    signUpWithApple: async () => { await signInWithApple(); },
  }), [user, loading, errorMessage]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
