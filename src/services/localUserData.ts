import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Every AsyncStorage key that holds data belonging to the signed-in person.
 *
 * These survive `supabase.auth.signOut()` because they are ours, not the auth
 * client's. Left in place they leak one account's meals, workouts, shared
 * posts, scan allowance and dietary profile — allergies included — into the
 * next account used on the same device, and they make a deleted account look
 * partly alive after deletion.
 *
 * Device-level preferences deliberately stay: the chosen appearance and the
 * "onboarding seen" flag describe the phone, not the person.
 */
const USER_SCOPED_KEYS = [
  "strictlyfuel:p0-state:v1",       // workout, target, meals, saved + local posts
  "strictlyfuel:usage:scan:v1",     // weekly AI scan counter
  "strictlyfuel:usage:reshuffle:v1",// weekly reshuffle counter
  "strictly:nutrition-profile:v1", // nutritionProfileService.PROFILE_KEY
];

/**
 * Wipe local per-user state. Best effort — a storage failure must never block
 * signing out or deleting an account, but it is worth surfacing in logs.
 */
export async function clearLocalUserData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(USER_SCOPED_KEYS);
  } catch (error) {
    console.warn("Could not clear local user data", error);
  }
}

export const localUserDataKeys = () => [...USER_SCOPED_KEYS];
