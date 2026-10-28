import React from "react";
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="recipe-detail" options={{ headerShown: false }} />
      <Stack.Screen name="meal-planner" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ headerShown: false }} />
      <Stack.Screen name="upgrade" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}
