import React from "react";
import { View, Platform } from "react-native";
import { Stack } from "expo-router";
import { WelcomeSplash } from "@/components/ui/WelcomeSplash";

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
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
        <Stack.Screen name="upgrade" options={{ headerShown: false, presentation: "modal" }} />
      </Stack>
      <WelcomeSplash />
    </View>
  );
}
