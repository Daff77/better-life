import React from "react";
import { useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import {
  ResponsiveTabBar,
  NAV_DESKTOP_BREAKPOINT,
  NAV_TOPBAR_HEIGHT,
  NAV_DOCK_GUTTER,
} from "@/components/layout/ResponsiveTabBar";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= NAV_DESKTOP_BREAKPOINT;

  return (
    <Tabs
      tabBar={(props) => <ResponsiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          // Desktop scenes clear the fixed top bar and the left quick-action dock.
          paddingTop: isDesktop ? NAV_TOPBAR_HEIGHT : 0,
          paddingLeft: isDesktop ? NAV_DOCK_GUTTER : 0,
          backgroundColor: "#edf1ee",
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
