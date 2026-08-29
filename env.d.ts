// env.d.ts

declare module "@env" {
  export const GOOGLE_CLIENT_ID: string;
  export const GOOGLE_IOS_ID: string;


  export const GOOGLE_EXPO_CLIENT_ID: string;
  export const GOOGLE_IOS_CLIENT_ID: string;
  export const GOOGLE_ANDROID_CLIENT_ID: string;
  export const APPSTORE_SECRET_KEY: string;

  /** @deprecated Read RevenueCat keys from EXPO_PUBLIC_REVENUECAT_* instead. */
  export const REVENUECAT_API_KEY: string;
}
