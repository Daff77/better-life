import React from "react";
import { Tabs } from "expo-router";
import { Colors } from "@/constants/DesignTokens";
import { AppText } from "@/components/ui";
import { AnimatedTabIcon } from "@/components/ui/AnimatedTabIcon";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.DEFAULT,
        tabBarInactiveTintColor: Colors.neutral.muted,
        tabBarStyle: {
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: Colors.neutral.borderLight,
        },
        tabBarLabel: ({ focused, children }) => (
          <AppText
            weight={focused ? "bold" : "medium"}
            className="text-xs"
            style={{ color: focused ? Colors.primary.DEFAULT : Colors.neutral.muted }}
          >
            {children}
          </AppText>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="Home"
              size={22}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="Meals"
              size={22}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="Recipes"
              size={22}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="Profile"
              size={22}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
