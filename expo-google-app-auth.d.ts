declare module "expo-google-app-auth" {
  export interface LogInConfig {
    androidClientId?: string;
    iosClientId?: string;
    expoClientId?: string;
    scopes?: string[];
  }

  export interface User {
    id: string;
    name: string;
    givenName: string;
    familyName: string;
    photoUrl?: string;
    email?: string;
  }

  export interface LogInResult {
    type: "cancel" | "success";
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    user?: User;
  }

  export function logInAsync(config: LogInConfig): Promise<LogInResult>;
}
