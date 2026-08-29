// env.d.ts

declare module "@env" {
  export const OPENAI_API_KEY: string;
  export const GOOGLE_CLIENT_ID: string;
  export const GOOGLE_IOS_ID: string;

  export const FIREBASE_API_KEY: string;
  export const FIREBASE_AUTH_DOMAIN: string;
  export const FIREBASE_PROJECT_ID: string;
  export const FIREBASE_STORAGE_BUCKET: string;
  export const FIREBASE_MESSAGING_SENDER_ID: string;
  export const FIREBASE_APP_ID: string;

  export const GOOGLE_EXPO_CLIENT_ID: string;
  export const GOOGLE_IOS_CLIENT_ID: string;
  export const GOOGLE_ANDROID_CLIENT_ID: string;
  export const APPSTORE_SECRET_KEY: string;

  /** @deprecated Read RevenueCat keys from EXPO_PUBLIC_REVENUECAT_* instead. */
  export const REVENUECAT_API_KEY: string;
}
