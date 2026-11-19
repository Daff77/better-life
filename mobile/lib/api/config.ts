import Constants from "expo-constants";
import { Platform } from "react-native";

const HTTPS_TUNNEL_HOST_PATTERNS = [
  ".exp.direct",
  ".ngrok-free.app",
  ".ngrok-free.dev",
  ".ngrok.app",
  ".ngrok.io",
  ".ngrok.dev",
  ".trycloudflare.com",
  ".loca.lt",
];

function isTunnelHost(host: string): boolean {
  const lower = host.toLowerCase();
  return HTTPS_TUNNEL_HOST_PATTERNS.some((suffix) => lower.includes(suffix));
}

export function resolveApiBaseOrigin(options?: {
  platformOS?: string;
  envUrl?: string;
  hostUri?: string;
  webLocation?: { hostname?: string; origin?: string } | null;
}): string {
  const os = options?.platformOS ?? Platform.OS;
  const envUrl = (options?.envUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "").trim();

  if (os === "web") {
    const loc =
      options?.webLocation !== undefined
        ? options.webLocation
        : typeof window !== "undefined" && window.location
          ? window.location
          : null;

    const isEnvLocal =
      !envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1");
    const isBrowserRemoteHost =
      Boolean(loc?.hostname) &&
      loc?.hostname !== "localhost" &&
      loc?.hostname !== "127.0.0.1" &&
      Boolean(loc?.origin);

    // When Expo Web is opened over LAN IP or an HTTPS tunnel, route /api through Metro's proxy on same origin.
    if (isEnvLocal && isBrowserRemoteHost && loc?.origin) {
      return loc.origin;
    }

    return envUrl || "http://localhost:4000";
  }

  // Explicit non-localhost production/staging URL takes precedence on native.
  if (
    envUrl &&
    !envUrl.includes("localhost") &&
    !envUrl.includes("127.0.0.1")
  ) {
    return envUrl;
  }

  // In Expo Go / Expo dev server (LAN e.g. "192.168.100.11:8081" or Tunnel e.g. "xxxx.exp.direct"),
  // Metro proxies /api/* to 127.0.0.1:4000. Tunnel endpoints require HTTPS on Android 9+ & iOS ATS.
  const rawHostUri =
    options?.hostUri ??
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (rawHostUri) {
    const trimmed = String(rawHostUri).trim();
    const explicitHttps = /^https:\/\//i.test(trimmed);
    const cleanHostUri = trimmed
      .replace(/^[a-z]+:\/\//i, "")
      .replace(/\/+$/, "");

    if (cleanHostUri) {
      const protocol = explicitHttps || isTunnelHost(cleanHostUri) ? "https" : "http";
      return `${protocol}://${cleanHostUri}`;
    }
  }

  // Fallback for Android emulator (10.0.2.2) or iOS simulator (localhost).
  return os === "android"
    ? "http://10.0.2.2:4000"
    : "http://localhost:4000";
}

const rawBase = resolveApiBaseOrigin();
export const API_BASE_URL = rawBase.endsWith("/api")
  ? rawBase
  : `${rawBase.replace(/\/+$/, "")}/api`;
