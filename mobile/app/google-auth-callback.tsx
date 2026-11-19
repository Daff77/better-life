import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { AppText, Button } from "@/components/ui";
import { CloseIconSvg } from "@/constants/Assets";
import { useAuthStore } from "@/stores/useAuthStore";

export default function GoogleAuthCallback() {
  const router = useRouter();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [statusMessage, setStatusMessage] = useState("Verifying Google credentials...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const processAuth = async () => {
      try {
        // Extract token from URL hash (implicit flow: #access_token=...)
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.substring(1)
          : window.location.hash;
        const search = window.location.search.startsWith("?")
          ? window.location.search.substring(1)
          : window.location.search;

        const params = new URLSearchParams(hash || search);
        const accessToken = params.get("access_token");
        const idToken = params.get("id_token");
        const state = params.get("state");
        const expectedState = window.sessionStorage.getItem("betterlife_google_state");
        if (!state || state !== expectedState) throw new Error("Google authentication state is invalid. Start sign-in again.");
        window.sessionStorage.removeItem("betterlife_google_state");
        window.history.replaceState(null, "", window.location.pathname);
        const error = params.get("error");

        if (error) {
          const desc = params.get("error_description") || error;
          setErrorMessage(desc);
          if (window.opener) {
            window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error: desc, state }, window.location.origin);
            setTimeout(() => window.close(), 1000);
          }
          return;
        }

        if (!accessToken || !idToken) {
          setErrorMessage("No access token found in callback response.");
          return;
        }

        setStatusMessage("Fetching your Google profile...");

        // Fetch user profile from Google UserInfo endpoint
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch Google profile info.");
        }

        const profile = await res.json();
        const googleUser = {
          name: profile.name || profile.given_name || "Google User",
          email: profile.email,
          photoUrl: profile.picture,
          googleId: profile.sub,
          idToken,
        };

        if (!window.opener && typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel(`betterlife_google_${state}`);
          channel.postMessage({ type: "GOOGLE_AUTH_SUCCESS", user: googleUser, idToken, state });
          setStatusMessage("Authentication complete. Returning to Better Life...");
          setTimeout(() => { channel.close(); window.close(); }, 400);
          return;
        }

        // Notify parent window if opened as popup
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "GOOGLE_AUTH_SUCCESS",
              user: googleUser,
              accessToken,
              idToken,
              state,
            },
            window.location.origin
          );
          setStatusMessage("Authentication successful! Closing window...");
          setTimeout(() => {
            window.close();
          }, 400);
          return;
        }

        // Direct same-window redirect fallback
        setStatusMessage("Signing in to Better Life...");
        const result = await loginWithGoogle(googleUser);
        if (!result.success) throw new Error(result.error || "Google login failed");

        if (result.isNewUser || !useAuthStore.getState().onboardingCompleted) {
          router.replace("/(onboarding)");
        } else {
          router.replace("/(app)/(tabs)");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "An error occurred during Google authentication.");
      }
    };

    processAuth();
  }, []);

  return (
    <View className="flex-1 bg-canvas items-center justify-center p-6">
      <View className="w-16 h-16 rounded-full bg-primary-light items-center justify-center mb-4">
        {errorMessage ? (
          <CloseIconSvg size={28} color="#b3301b" strokeWidth={2.6} />
        ) : (
          <ActivityIndicator size="large" color="#0e7a52" />
        )}
      </View>

      <AppText weight="bold" className="text-lg text-ink text-center mb-2">
        {errorMessage ? "Autentikasi Google Gagal" : "Memverifikasi Akun Google"}
      </AppText>

      <AppText weight="medium" className="text-sm text-muted text-center max-w-xs mb-6">
        {errorMessage || statusMessage}
      </AppText>

      {errorMessage ? (
        <Button
          title="Kembali ke Halaman Masuk"
          variant="primary"
          onPress={() => router.replace("/(auth)/login")}
        />
      ) : null}
    </View>
  );
}
