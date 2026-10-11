import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

// Required for web and native auth session redirects to complete cleanly
WebBrowser.maybeCompleteAuthSession();

export interface GoogleUser {
  name: string;
  email: string;
  photoUrl?: string;
  googleId?: string;
}

export const DEFAULT_WEB_CLIENT_ID = "340702974194-mqp84cjopen5b8rh4jaqt06g8o2t1c0g.apps.googleusercontent.com";
export const KNOWN_ANDROID_CLIENT_ID = "340702974194-jq0tckl1mqlea45rul20694h4r9mg61a.apps.googleusercontent.com";

const STORAGE_KEY_CLIENT_ID = "betterlife_custom_google_client_id";

export const googleAuthService = {
  getClientId(): string {
    // 1. Check custom client ID from storage if valid and not the blocked Android client ID
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY_CLIENT_ID);
      if (stored && stored.trim()) {
        const clean = stored.trim();
        // If user previously pasted Android client ID, fallback to Web Client ID to prevent Google Error 400
        if (clean === KNOWN_ANDROID_CLIENT_ID) {
          return DEFAULT_WEB_CLIENT_ID;
        }
        return clean;
      }
    }

    // 2. Check environment variable for Web Client ID
    const webId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
    if (webId.trim() && webId.trim() !== KNOWN_ANDROID_CLIENT_ID) {
      return webId.trim();
    }

    // 3. Fallback to tested and verified Web Client ID
    return DEFAULT_WEB_CLIENT_ID;
  },

  setClientId(clientId: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      if (clientId.trim()) {
        window.localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
      } else {
        window.localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
      }
    }
  },

  resetClientId(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
    }
  },

  getRedirectUri(): string {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.location) {
        // Use current origin if available, fallback to 8081
        return `${window.location.origin}/google-auth-callback`;
      }
      return "http://localhost:8081/google-auth-callback";
    }

    // On native Expo
    return "http://localhost:8081/google-auth-callback";
  },

  buildAuthUrl(clientId: string): string {
    // Prevent sending Android client ID to web auth endpoint
    const safeClientId =
      clientId === KNOWN_ANDROID_CLIENT_ID ? DEFAULT_WEB_CLIENT_ID : (clientId || DEFAULT_WEB_CLIENT_ID);

    const redirectUri = this.getRedirectUri();
    const params = new URLSearchParams({
      client_id: safeClientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      prompt: "select_account",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  async signInWithGoogle(): Promise<{
    success: boolean;
    user?: GoogleUser;
    error?: string;
  }> {
    const clientId = this.getClientId();
    if (!clientId) {
      return {
        success: false,
        error: "NO_CLIENT_ID",
      };
    }

    const authUrl = this.buildAuthUrl(clientId);

    if (Platform.OS === "web") {
      return this.signInWebPopup(authUrl);
    } else {
      return this.signInNativeBrowser(authUrl);
    }
  },

  signInWebPopup(authUrl: string): Promise<{
    success: boolean;
    user?: GoogleUser;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const width = 500;
      const height = 620;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        "google_oauth_popup",
        `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,location=1`
      );

      if (!popup) {
        resolve({
          success: false,
          error: "Popup window was blocked by browser. Please allow popups for this site.",
        });
        return;
      }

      let isResolved = false;

      const messageListener = (event: MessageEvent) => {
        if (!event.data || typeof event.data !== "object") return;

        if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
          isResolved = true;
          window.removeEventListener("message", messageListener);
          clearInterval(checkPopupClosed);
          resolve({
            success: true,
            user: event.data.user,
          });
        } else if (event.data.type === "GOOGLE_AUTH_ERROR") {
          isResolved = true;
          window.removeEventListener("message", messageListener);
          clearInterval(checkPopupClosed);
          resolve({
            success: false,
            error: event.data.error || "Authentication cancelled or failed.",
          });
        }
      };

      window.addEventListener("message", messageListener);

      // Check if user manually closed popup
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener("message", messageListener);
          if (!isResolved) {
            resolve({
              success: false,
              error: "Google Sign-In popup was closed before completion.",
            });
          }
        }
      }, 800);
    });
  },

  async signInNativeBrowser(authUrl: string): Promise<{
    success: boolean;
    user?: GoogleUser;
    error?: string;
  }> {
    try {
      const redirectUri = this.getRedirectUri();
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === "success" && result.url) {
        const hash = result.url.includes("#") ? result.url.split("#")[1] : "";
        const query = result.url.includes("?") ? result.url.split("?")[1] : "";
        const params = new URLSearchParams(hash || query);

        const error = params.get("error");
        if (error) {
          const errorDesc = params.get("error_description") || error;
          return {
            success: false,
            error: errorDesc,
          };
        }

        const accessToken = params.get("access_token");
        if (!accessToken) {
          return {
            success: false,
            error: params.get("error_description") || "No access token received from Google.",
          };
        }

        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          return { success: false, error: "Failed to fetch Google profile." };
        }

        const profile = await res.json();
        return {
          success: true,
          user: {
            name: profile.name || "Google User",
            email: profile.email,
            photoUrl: profile.picture,
            googleId: profile.sub,
          },
        };
      }

      return {
        success: false,
        error: "Google Sign-In cancelled.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to launch Google auth session.",
      };
    }
  },
};
