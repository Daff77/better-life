import { Platform } from "react-native";

// In web, localhost works directly. In Android emulator, 10.0.2.2 points to host.
const envUrl = process.env.EXPO_PUBLIC_API_URL;
const defaultHost =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
const rawBase = envUrl || defaultHost;
export const API_BASE_URL = rawBase.endsWith("/api")
  ? rawBase
  : `${rawBase.replace(/\/+$/, "")}/api`;

