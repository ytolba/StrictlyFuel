import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert } from "react-native";
import { auth, db } from "../firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  reload,
  deleteUser as firebaseDeleteUser,
  User as FirebaseUser,
  signInAnonymously,
  signInWithCredential,
  OAuthProvider,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  collection,
  getDocs,
  where,
  updateDoc,
} from "firebase/firestore";
import * as AppleAuthentication from "expo-apple-authentication";
import { APPLE_SIGN_IN_ENABLED } from "../config/authFeatures";

// Define User Interface
interface User {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  createdAt: string;
  lastLogin: string;
}

// Define Context Interface
interface AuthContextType {
  user: User | null;
  errorMessage: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void; // Clear error messages
  deleteAccount: () => Promise<void>;
  continueWithoutAccount: () => Promise<void>;
  signInWithApple: () => Promise<User | null>;
  signUpWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Utility function to set errors
  const handleError = (error: any) => {
    const message = error?.message || "An unexpected error occurred.";
    setErrorMessage(message);
  };

  // Clear the error message
  const clearError = () => setErrorMessage(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Ensure the user object is up-to-date
          await reload(firebaseUser);

          // Check if the user is anonymous
          if (firebaseUser.isAnonymous) {
            // Handle anonymous users
            setUser({
              uid: firebaseUser.uid,
              email: "You are not Signed in!",
              firstName: "Make and Account to sign in and use more",
              lastName: "",
              picture: "",
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            });
          } else {
            // Handle authenticated users (email/password)
            if (firebaseUser.emailVerified) {
              const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUser({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  firstName: userData?.firstName,
                  lastName: userData?.lastName,
                  picture: userData?.picture,
                  createdAt: userData?.createdAt || new Date().toISOString(),
                  lastLogin: userData?.lastLogin || new Date().toISOString(),
                });
              } else {
                const newUser = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  createdAt: new Date().toISOString(),
                  lastLogin: new Date().toISOString(),
                };
                await setDoc(doc(db, "users", firebaseUser.uid), newUser);
                setUser(newUser);
              }
            } else {
              // Email not verified; sign out the user
              await firebaseSignOut(auth);
              setUser(null);
              setErrorMessage("Please verify your email before signing in.");
            }
          }
        } catch (error: any) {
          handleError(error);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateUserPremiumStatus = async () => {
    if (user?.uid) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        premium: true,
        subscriptionDate: new Date().toISOString(),
      });
    }
  };

  const continueWithoutAccount = async () => {
    try {
      await signInAnonymously(auth); // Wait for anonymous sign-in to complete
      console.log("User signed in anonymously");
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      throw error; // Ensure the calling function can catch this error
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      clearError();
      console.log("trying to log in");
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      // Check if the email is verified
      if (!firebaseUser.emailVerified) {
        await firebaseSignOut(auth);
        throw new Error("Please verify your email before signing in.");
      }
    } catch (error: any) {
      console.log(error);
      if (error?.message == "Firebase: Error (auth/invalid-credential).") {
        Alert.alert("Uh Oh", "Incorrect Password", [{ text: "OK" }]);
      }

      handleError(error);
    }
  };

  const signOut = async () => {
    try {
      clearError();
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error: any) {
      handleError(error);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      clearError();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Send email verification
      await sendEmailVerification(firebaseUser);

      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        firstName,
        lastName,
        picture: "",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
      const isPremium = new Date().getFullYear() === 2024;
      if (isPremium) {
        const userRef = doc(db, "users", firebaseUser.uid);
        await updateDoc(userRef, {
          premium: true,
          subscriptionDate: new Date().toISOString(),
        });
      }
      // Sign out the user to prevent access before email verification
      await firebaseSignOut(auth);

      setErrorMessage(
        "Account created successfully! Please verify your email before signing in."
      );
    } catch (error: any) {
      handleError(error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      clearError();
      console.log(email);
      await sendPasswordResetEmail(auth, email);
      setErrorMessage("A password reset link has been sent to your email.");
    } catch (error: any) {
      handleError(error);
    }
  };
  const deleteAccount = async () => {
    if (!user) {
      Alert.alert("Error", "No user is currently signed in.");
      return;
    }
    try {
      clearError();
      const userRef = doc(db, "users", user.uid);

      // Delete Firestore document
      await deleteDoc(userRef);

      // Delete Firebase Authentication account
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        await firebaseDeleteUser(firebaseUser);
      }

      setUser(null);
      //Alert.alert("Account Deleted", "Your account has been successfully deleted.");
    } catch (error: any) {
      handleError(error);
      Alert.alert("Error", "Failed to delete your account. Please try again.");
    }
  };

  const signInWithApple = async (): Promise<User | null> => {
    if (!APPLE_SIGN_IN_ENABLED) {
      throw new Error("Apple Sign In is temporarily disabled.");
    }

    try {
      clearError();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log("Apple credential:", credential);

      // First create the Firebase credential
      const { identityToken } = credential;
      if (!identityToken) throw new Error("No identity token provided");

      const provider = new OAuthProvider("apple.com");
      const authCredential = provider.credential({
        idToken: identityToken,
        rawNonce: credential.state || undefined,
      });

      // Sign in with Firebase first
      const userCredential = await signInWithCredential(auth, authCredential);
      const firebaseUser = userCredential.user;

      // Then create the user object
      const newUser = {
        uid: firebaseUser.uid, // Use Firebase UID instead of Apple user ID
        email: credential.email || firebaseUser.email || "",
        firstName: credential.fullName?.givenName || "",
        lastName: credential.fullName?.familyName || "",
        picture: "",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // Save user data to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), newUser);

      // Initialize scan count in userScans collection
      const userScanData = {
        count: 0,
        lastScanDate: new Date().toISOString(),
        isPremium: false,
        userId: firebaseUser.uid,
      };

      await setDoc(doc(db, "userScans", firebaseUser.uid), userScanData);

      setUser(newUser);
      return newUser;
    } catch (error: any) {
      console.error("Apple Sign In error:", error);
      handleError(error);
      Alert.alert("Error", "Apple Sign In failed. Please try again.");
      throw error;
    }
  };

  const signUpWithApple = async () => {
    // For now, we can use the same function for both sign in and sign up
    return signInWithApple();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        errorMessage,
        signInWithEmail,
        signOut,
        signUpWithEmail,
        resetPassword,
        clearError,
        deleteAccount,
        continueWithoutAccount,
        signInWithApple,
        signUpWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
