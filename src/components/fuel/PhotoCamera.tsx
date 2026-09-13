import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { strictlyColors, strictlyRadius, strictlyType } from "../../theme/strictlyTheme";

export function PhotoCamera({ hint, onCapture, onCancel }: { hint: string; onCapture: (uri: string) => void | Promise<void>; onCancel: () => void }) {
  const camera = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const takePhoto = async () => {
    if (!camera.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.92, skipProcessing: false });
      if (photo?.uri) await onCapture(photo.uri);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission?.granted) return <View style={styles.permission}><Ionicons name="camera-outline" size={28} color={strictlyColors.accentText} /><Text style={styles.permissionText}>Camera access is needed for this scan.</Text><TouchableOpacity style={styles.permissionButton} onPress={requestPermission}><Text style={styles.permissionButtonText}>Allow camera</Text></TouchableOpacity><TouchableOpacity onPress={onCancel} style={styles.cancelTextButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></View>;

  return <View style={styles.wrap}>
    <CameraView ref={camera} style={styles.camera} facing="back" enableTorch={torch} />
    <View style={styles.topControls}>
      <TouchableOpacity style={styles.control} onPress={onCancel} accessibilityLabel="Close camera"><Ionicons name="close" size={22} color={strictlyColors.white} /></TouchableOpacity>
      <TouchableOpacity style={[styles.control, torch && styles.controlActive]} onPress={() => setTorch((value) => !value)} accessibilityLabel={torch ? "Turn flash off" : "Turn flash on"}><Ionicons name={torch ? "flash" : "flash-outline"} size={21} color={torch ? strictlyColors.onLime : strictlyColors.white} /></TouchableOpacity>
    </View>
    <View style={styles.bottomControls}><Text style={styles.hint}>{hint}</Text><TouchableOpacity style={styles.shutterOuter} onPress={takePhoto} disabled={capturing} accessibilityLabel="Take photo"><View style={[styles.shutter, capturing && styles.shutterBusy]} /></TouchableOpacity></View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { height: 500, overflow: "hidden", borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.ink },
  camera: { ...StyleSheet.absoluteFillObject },
  topControls: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between" },
  control: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.glass },
  controlActive: { backgroundColor: strictlyColors.lime },
  bottomControls: { position: "absolute", left: 18, right: 18, bottom: 18, alignItems: "center", gap: 13 },
  hint: { paddingHorizontal: 13, paddingVertical: 7, overflow: "hidden", borderRadius: strictlyRadius.pill, backgroundColor: strictlyColors.glass, color: strictlyColors.white, fontFamily: strictlyType.sansMedium, fontSize: 11, textAlign: "center" },
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: strictlyColors.white, alignItems: "center", justifyContent: "center" },
  shutter: { width: 58, height: 58, borderRadius: 29, backgroundColor: strictlyColors.white }, shutterBusy: { opacity: 0.45 },
  permission: { minHeight: 300, padding: 24, alignItems: "center", justifyContent: "center", borderRadius: strictlyRadius.large, backgroundColor: strictlyColors.surface },
  permissionText: { marginTop: 10, color: strictlyColors.text, fontFamily: strictlyType.sans, fontSize: 12 },
  permissionButton: { height: 46, marginTop: 15, paddingHorizontal: 18, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.lime, alignItems: "center", justifyContent: "center" },
  permissionButtonText: { color: strictlyColors.onLime, fontFamily: strictlyType.sansMedium, fontWeight: "800" },
  cancelTextButton: { padding: 12 }, cancelText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sansMedium },
});
