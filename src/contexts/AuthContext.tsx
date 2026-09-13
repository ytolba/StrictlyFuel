import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { clearLocalUserData } from "../services/localUserData";
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
  isPasswordRecovery: boolean;
  passwordRecoveryReady: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string) => Promise<{ confirmationRequired: boolean }>;
  verifySignUpCode: (email: string, token: string) => Promise<void>;
  resendSignUpCode: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  cancelPasswordRecovery: () => void;
  clearError: () => void;
  deleteAccount: () => Promise<void>;
  continueWithoutAccount: () => Promise<void>;
  signInWithApple: () => Promise<User | null>;
  signUpWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_CALLBACK_URL = "strictlyfuel://auth/callback";
const PASSWORD_RECOVERY_URL = "strictlyfuel://reset-password";

type AuthCallbackResult = "ignored" | "auth" | "recovery";

const isPasswordRecoveryUrl = (url: string) =>
  url.startsWith(PASSWORD_RECOVERY_URL);

const authParamsFromUrl = (url: string) => {
  const params = new URLSearchParams();
  const query = url.split("?")[1]?.split("#")[0] || "";
  const fragment = url.split("#")[1] || "";
  new URLSearchParams(query).forEach((value, key) => params.set(key, value));
  new URLSearchParams(fragment).forEach((value, key) => params.set(key, value));
  return params;
};

async function applyAuthCallback(url: string): Promise<AuthCallbackResult> {
  const recoveryUrl = isPasswordRecoveryUrl(url);
  if (!url.startsWith(AUTH_CALLBACK_URL) && !recoveryUrl) return "ignored";
  const params = authParamsFromUrl(url);
  const callbackType = params.get("type");
  const isRecovery = recoveryUrl || callbackType === "recovery";
  const callbackError = params.get("error_description") || params.get("error_code") || params.get("error");
  if (callbackError) throw new Error(callbackError);
  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return isRecovery ? "recovery" : "auth";
  }
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return isRecovery ? "recovery" : "auth";
  }
  if (isRecovery) throw new Error("Email link is invalid or has expired");
  return "auth";
}

const messageFor = (error: unknown) => {
  const raw = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  if (/invalid login credentials/i.test(raw)) return "That email and password do not match.";
  if (/email not confirmed/i.test(raw)) return "Check your inbox and confirm your email before signing in.";
  if (/already registered|already been registered|user already exists/i.test(raw)) return "An account already exists for that email.";
  if (/password/i.test(raw) && /6 characters/i.test(raw)) return "Use a password with at least 6 characters.";
  if (/email link is invalid|otp_expired|access_denied|link.*expired/i.test(raw)) {
    return "This password reset link is invalid or has expired. Request a new link below.";
  }
  if (/token has expired|invalid otp|token is invalid/i.test(raw)) return "That code is incorrect or has expired. Request a new one and try again.";
  if (/for security purposes|rate limit|over_email_send_rate_limit/i.test(raw)) {
    return "Too many reset emails were sent. Wait about an hour, then try once more.";
  }
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [passwordRecoveryReady, setPasswordRecoveryReady] = useState(false);

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

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setPasswordRecoveryReady(true);
      }
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
    const handleAuthUrl = async (url: string) => {
      const recoveryUrl = isPasswordRecoveryUrl(url);
      if (recoveryUrl) {
        setIsPasswordRecovery(true);
        setPasswordRecoveryReady(false);
      }
      try {
        const result = await applyAuthCallback(url);
        if (result === "recovery") {
          setErrorMessage(null);
          setIsPasswordRecovery(true);
          setPasswordRecoveryReady(true);
        }
      } catch (error) {
        if (recoveryUrl) {
          setIsPasswordRecovery(true);
          setPasswordRecoveryReady(false);
        }
        setErrorMessage(messageFor(error));
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => handleAuthUrl(url));
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

  const updatePassword = async (password: string) => {
    try {
      clearError();
      if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsPasswordRecovery(false);
      setPasswordRecoveryReady(false);
    } catch (error) { fail(error); }
  };

  const cancelPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    setPasswordRecoveryReady(false);
    clearError();
  };

  const signOut = async () => {
    clearError();
    const { error } = await supabase.auth.signOut();
    if (error) fail(error);
    // Meals, workouts, allergies and the scan counter live in AsyncStorage and
    // are not touched by signOut, so without this the next person to sign in on
    // this device inherits them.
    await clearLocalUserData();
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

  /**
   * Read the real reason out of a functions.invoke failure.
   *
   * supabase-js collapses every non-2xx response into the same
   * "Edge Function returned a non-2xx status code" message and hides the body
   * on `error.context`, which is the actual Response. Without unwrapping it,
   * a missing deployment, an expired session and a server misconfiguration all
   * look identical to the person tapping Delete.
   */
  const readFunctionError = async (error: any): Promise<string> => {
    const response: Response | undefined = error?.context;
    if (response && typeof response.text === "function") {
      try {
        const body = await response.text();
        const parsed = body ? JSON.parse(body) : null;
        if (parsed?.error) return parsed.error;
        if (body) return body;
      } catch {
        // Body was not JSON, or had already been consumed.
      }
      if (response.status === 404) {
        return "Account deletion isn’t available yet — the server function has not been deployed.";
      }
      if (response.status === 401) {
        return "Your session has expired. Sign in again, then delete your account.";
      }
    }
    if (/failed to fetch|network/i.test(String(error?.message))) {
      return "We couldn’t reach the server. Check your connection and try again.";
    }
    return error?.message || "Something went wrong on our side. Please try again.";
  };

  const deleteAccount = async () => {
    if (!user) return;

    // The function authorises the caller from their own JWT, so a live session
    // is required. Refresh it first rather than sending a stale token.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      Alert.alert("Sign in again", "Your session has expired. Sign in again, then delete your account.");
      return;
    }

    // Handled server-side by the delete-account edge function, which resolves
    // the caller from their own JWT and cascades the delete across their data.
    const { data, error } = await supabase.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });

    if (error || !data?.deleted) {
      const message = error ? await readFunctionError(error) : "The server did not confirm the deletion.";
      Alert.alert("We couldn’t delete the account", message);
      return;
    }

    // The auth user is gone, so signOut may itself 403 — the local session must
    // be cleared either way.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    await clearLocalUserData();
    setUser(null);
    Alert.alert("Account deleted", "Your account and its data have been removed.");
  };

  const value = useMemo<AuthContextType>(() => ({
    user, loading, errorMessage, isPasswordRecovery, passwordRecoveryReady, signInWithEmail, signOut, signUpWithEmail, verifySignUpCode, resendSignUpCode, resetPassword, updatePassword,
    cancelPasswordRecovery, clearError, deleteAccount, continueWithoutAccount, signInWithApple,
    signUpWithApple: async () => { await signInWithApple(); },
  }), [user, loading, errorMessage, isPasswordRecovery, passwordRecoveryReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
