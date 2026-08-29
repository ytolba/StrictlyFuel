import { NativeModules, Platform } from "react-native";

type StrictlyOCRModule = { recognizeText: (imagePath: string) => Promise<string> };

/** Read printed text on-device with Apple's Vision framework. No network or AI call. */
export async function extractTextFromImage(imagePath: string): Promise<string> {
  if (Platform.OS !== "ios") throw new Error("On-device label reading is currently available on iPhone.");
  const module = NativeModules.StrictlyOCR as StrictlyOCRModule | undefined;
  if (!module?.recognizeText) throw new Error("On-device text reading is unavailable in this build.");
  return module.recognizeText(imagePath);
}
