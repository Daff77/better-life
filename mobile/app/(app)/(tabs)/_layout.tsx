import React from "react";
import { Tabs } from "expo-router";
import { AppTabBar } from "@/components/ui/BottomNavigation";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>

  );
}
