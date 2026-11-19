import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";

export default function OnboardingLayout() {
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
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="plan" />
    </Stack>
  );
}
