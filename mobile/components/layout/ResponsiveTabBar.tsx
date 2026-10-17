import React from "react";
import {
  View,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AnimatedTabIcon } from "@/components/ui/AnimatedTabIcon";
import { useAuthStore } from "@/stores/useAuthStore";

export interface ResponsiveTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors: Record<string, { options: any }>;
  navigation: any;
  insets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export const ResponsiveTabBar: React.FC<ResponsiveTabBarProps> = ({
  state,
  descriptors,
  navigation,
  insets,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const user = useAuthStore((state) => state.user);

  // Derive user initials for avatar
  const userInitials = React.useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  const handleTabPress = (routeKey: string, routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  // 1. DESKTOP / TABLET TOP NAVIGATION
  if (isDesktop) {
    return (
      <View
        className="w-full bg-white/95 backdrop-blur-md border-b border-[#e5ece7] z-50 shadow-2xs"
        accessibilityLabel="Desktop primary navigation"
      >
        <View className="max-w-[1240px] w-full mx-auto px-6 h-16 flex-row items-center justify-between">
          {/* Brand Logo & Name */}
          <TouchableOpacity
            onPress={() => navigation.navigate("index")}
            activeOpacity={0.8}
            className={`flex-row items-center gap-3 ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
            accessibilityRole="link"
            accessibilityLabel="Better Life Home"
          >
            <View className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 items-center justify-center">
              <AppText className="text-lg">🌿</AppText>
            </View>
            <View>
              <AppText weight="black" className="text-base text-neutral-dark tracking-tight leading-none">
                Better Life
              </AppText>
              <AppText weight="semibold" className="text-[10px] text-emerald-800 tracking-wider uppercase mt-0.5">
                Wellness & Nutrition
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Navigation Route Pills */}
          <View className="flex-row items-center bg-[#f2f6f3] p-1 rounded-2xl border border-[#e2eae4] gap-1">
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key] || {};
              const label =
                options?.tabBarLabel !== undefined
                  ? typeof options.tabBarLabel === "function"
                    ? route.name
                    : options.tabBarLabel
                  : options?.title !== undefined
                  ? options.title
                  : route.name;

              const isFocused = state.index === index;
              const displayLabel =
                label === "index" ? "Home" : typeof label === "string" ? label : route.name;

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={() => handleTabPress(route.key, route.name, isFocused)}
                  className={`px-4 py-2 rounded-xl flex-row items-center gap-2 transition-all duration-150 ${
                    Platform.OS === "web" ? "cursor-pointer" : ""
                  } ${
                    isFocused
                      ? "bg-white shadow-2xs border border-emerald-600/20"
                      : "hover:bg-white/60"
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={`Navigate to ${displayLabel}`}
                >
                  <AnimatedTabIcon
                    name={displayLabel}
                    focused={isFocused}
                    size={17}
                    color={isFocused ? "#059669" : "#6b7280"}
                  />
                  <AppText
                    weight={isFocused ? "black" : "semibold"}
                    className={`text-xs transition-colors ${
                      isFocused ? "text-emerald-900" : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {displayLabel}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* User Profile Quick Control */}
          <TouchableOpacity
            onPress={() => navigation.navigate("profile")}
            activeOpacity={0.8}
            className={`flex-row items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-[#e5ece7] hover:border-emerald-600/40 hover:bg-emerald-50/30 transition-all ${
              Platform.OS === "web" ? "cursor-pointer" : ""
            }`}
            accessibilityRole="button"
            accessibilityLabel="Open user profile settings"
          >
            <View className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300/70 items-center justify-center">
              <AppText weight="black" className="text-xs text-emerald-800">
                {userInitials}
              </AppText>
            </View>
            <AppText weight="bold" className="text-xs text-neutral-dark max-w-[120px]" numberOfLines={1}>
              {user?.name || "Account"}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. MOBILE BOTTOM NAVIGATION
  return (
    <View
      className="w-full bg-white/95 backdrop-blur-md border-t border-[#e5ece7] shadow-sm"
      style={{
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 6,
      }}
      accessibilityRole="tablist"
      accessibilityLabel="Mobile bottom navigation"
    >
      <View className="flex-row items-center justify-around max-w-[480px] mx-auto w-full">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] || {};
          const label =
            options?.tabBarLabel !== undefined
              ? typeof options.tabBarLabel === "function"
                ? route.name
                : options.tabBarLabel
              : options?.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;
          const displayLabel =
            label === "index" ? "Home" : typeof label === "string" ? label : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => handleTabPress(route.key, route.name, isFocused)}
              className="items-center justify-center py-1 px-3 flex-1 active:opacity-75"
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={`Navigate to ${displayLabel}`}
            >
              <AnimatedTabIcon
                name={displayLabel}
                focused={isFocused}
                size={21}
                color={isFocused ? "#059669" : "#888888"}
              />
              <AppText
                weight={isFocused ? "bold" : "medium"}
                className={`text-[11px] mt-1 ${isFocused ? "text-emerald-800" : "text-neutral-muted"}`}
              >
                {displayLabel}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
