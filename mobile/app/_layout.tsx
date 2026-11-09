import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { SplashScreen, Stack } from "expo-router";
import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useJournalStore } from "@/stores/useJournalStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import "../styles/global.css";
import "@/lib/nativewindInterop";

// Completely suppress on-screen LogBox notifications in development
LogBox.ignoreAllLogs(true);

if (__DEV__) {
  // Filter out benign React Native, Reanimated, and dependency warnings from terminal/console
  const IGNORED_WARNING_SUBSTRINGS = [
    "pointerEvents",
    "[Reanimated]",
    "react-native-svg",
    "NativeWind",
    "Non-serializable",
    "Sending `onAnimatedValueUpdate`",
    "Overriding previous layout animation",
    "Support for defaultProps",
  ];

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = typeof args[0] === "string" ? args[0] : "";
    if (IGNORED_WARNING_SUBSTRINGS.some((substr) => message.includes(substr))) {
      return;
    }
    originalWarn(...args);
  };
}

// Prevent auto-hiding the splash screen until assets are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Urbanist-Regular": require("../assets/fonts/Urbanist-Regular.ttf"),
    "Urbanist-Medium": require("../assets/fonts/Urbanist-Medium.ttf"),
    "Urbanist-SemiBold": require("../assets/fonts/Urbanist-SemiBold.ttf"),
    "Urbanist-Bold": require("../assets/fonts/Urbanist-Bold.ttf"),
    "Urbanist-ExtraBold": require("../assets/fonts/Urbanist-ExtraBold.ttf"),
  });

  useEffect(() => {
    useAuthStore.getState().initializeAuth();
    useOnboardingStore.getState().initializePersonalization();
    useJournalStore.getState().initialize();
    useSubscriptionStore.getState().fetchStatus();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            // Native fade transitions on Android provide 60 FPS performance without sliding heavy cards
            animation: Platform.OS === "android" ? "fade" : "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="test-input" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
