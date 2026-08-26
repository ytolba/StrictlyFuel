import { NativeModules, Platform } from "react-native";

type StrictlyOCRModule = {
  recognizeText: (imagePath: string) => Promise<string>;
};

/** Uses Apple's on-device Vision framework on iOS. */
export const extractTextFromImage = async (imagePath: string): Promise<string> => {
  if (Platform.OS !== "ios") {
    throw new Error("Apple Vision OCR is only available on iOS");
  }

  const module = NativeModules.StrictlyOCR as StrictlyOCRModule | undefined;
  if (!module?.recognizeText) {
    throw new Error("Apple Vision OCR is not available in this build");
  }

  return module.recognizeText(imagePath);
};
