import { Platform } from "react-native";

// In web, localhost works directly. In Android emulator, 10.0.2.2 points to host.
export const API_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:4000/api"
    : "http://localhost:4000/api";
