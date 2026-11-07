import React from "react";
import { useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { ResponsiveTabBar } from "@/components/layout/ResponsiveTabBar";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <Tabs
      tabBar={(props) => <ResponsiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          marginLeft: isDesktop ? 230 : 0,
          backgroundColor: "#faf9f5",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="meals" options={{ title: "Makan" }} />
      <Tabs.Screen name="recipes" options={{ title: "Resep" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
