import React from "react";
import { View, Platform, ActivityIndicator } from "react-native";
import { Redirect, Stack } from "expo-router";
import { WelcomeSplash } from "@/components/ui/WelcomeSplash";
import { useStepTracking } from "@/hooks/useStepTracking";
import { useAuthStore } from "@/stores/useAuthStore";

function AuthenticatedStepTracking() {
  useStepTracking();
  return null;
}

export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <ActivityIndicator size="large" color="#0e7a52" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/get-started" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <AuthenticatedStepTracking />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === "android" ? "fade_from_bottom" : "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-detail" options={{ headerShown: false }} />
        <Stack.Screen name="meal-planner" options={{ headerShown: false }} />
        <Stack.Screen name="analytics" options={{ headerShown: false }} />
        <Stack.Screen name="community" options={{ headerShown: false }} />
        <Stack.Screen name="reminders" options={{ headerShown: false }} />
        <Stack.Screen name="steps" options={{ headerShown: false }} />
        <Stack.Screen name="upgrade" options={{ headerShown: false, presentation: "modal" }} />
      </Stack>
      <WelcomeSplash />
    </View>
  );
}
