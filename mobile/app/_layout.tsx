import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useJournalStore } from "@/stores/useJournalStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import "../styles/global.css";

// Prevent auto-hiding the splash screen until assets are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Akatab-Regular": require("../assets/fonts/Akatab-Regular.ttf"),
    "Akatab-Medium": require("../assets/fonts/Akatab-Medium.ttf"),
    "Akatab-SemiBold": require("../assets/fonts/Akatab-SemiBold.ttf"),
    "Akatab-Bold": require("../assets/fonts/Akatab-Bold.ttf"),
    "Akatab-ExtraBold": require("../assets/fonts/Akatab-ExtraBold.ttf"),
    "Akatab-Black": require("../assets/fonts/Akatab-Black.ttf"),
  });

  useEffect(() => {
    useAuthStore.getState().initializeAuth();
    useOnboardingStore.getState().initializePersonalization();
    useJournalStore.getState().initialize();
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
            animation: "slide_from_right",
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
