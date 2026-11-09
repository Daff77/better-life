import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // On web, localhost or explicit env URL works directly.
  if (Platform.OS === "web") {
    return envUrl || "http://localhost:4000";
  }

  // If an explicit non-localhost URL is configured (e.g. production URL), use it.
  if (
    envUrl &&
    !envUrl.includes("localhost") &&
    !envUrl.includes("127.0.0.1")
  ) {
    return envUrl;
  }

  // In Expo Go / Expo dev server (both LAN mode e.g. "192.168.100.11:8081" and
  // Tunnel mode e.g. "xxxx.exp.direct"), Metro proxies /api/* to 127.0.0.1:4000.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const cleanHostUri = hostUri.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (cleanHostUri) {
      return `http://${cleanHostUri}`;
    }
  }

  // Fallback for Android emulator (10.0.2.2) or iOS simulator (localhost).
  return Platform.OS === "android"
    ? "http://10.0.2.2:4000"
    : "http://localhost:4000";
}

const rawBase = resolveBaseUrl();
export const API_BASE_URL = rawBase.endsWith("/api")
  ? rawBase
  : `${rawBase.replace(/\/+$/, "")}/api`;



