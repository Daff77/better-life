import React from "react";
import { View, TouchableOpacity, Platform } from "react-native";
import { Tabs } from "expo-router";
import { AppText } from "./AppText";
import { AnimatedTabIcon } from "./AnimatedTabIcon";
import { Colors } from "@/constants/DesignTokens";

export type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

export const AppTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {


  const isWeb = Platform.OS === "web";

  return (
    <View
      className={`w-full ${
        isWeb ? "bg-[#eef5f1] items-center" : "bg-transparent"
      }`}
    >
      <View
        className={`w-full bg-white border-t border-neutral-border-light/80 h-[72px] flex-row items-center justify-around px-3 shadow-lg ${
          isWeb ? "max-w-[460px] border-x border-neutral-border-light/60" : ""
        }`}
        style={{
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          let label = "Tab";
          if (typeof options.tabBarLabel === "string") {
            label = options.tabBarLabel;
          } else if (typeof options.title === "string") {
            label = options.title;
          } else {
            label = route.name === "index" ? "Home" : route.name;
          }

          // Capitalize
          const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || `${displayLabel} tab`}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              className="items-center justify-center py-1 flex-1"
            >
              {isFocused ? (
                <View className="flex-row items-center bg-primary/15 border border-primary/40 px-3.5 py-1.5 rounded-full gap-x-1.5 shadow-2xs">
                  <AnimatedTabIcon
                    name={displayLabel}
                    size={20}
                    color={Colors.primary.DEFAULT}
                    focused={true}
                  />
                  <AppText weight="extrabold" className="text-xs text-primary tracking-wide">
                    {displayLabel}
                  </AppText>
                </View>
              ) : (
                <View className="items-center justify-center p-2 opacity-60">
                  <AnimatedTabIcon
                    name={displayLabel}
                    size={22}
                    color="#64748b"
                    focused={false}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

