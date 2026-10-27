import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AnimatedTabIcon } from "@/components/ui/AnimatedTabIcon";
import { useAuthStore } from "@/stores/useAuthStore";
import { BrandImages, CrownIconSvg, LeafIconSvg } from "@/constants/Assets";

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

  // 1. DESKTOP / TABLET LEFT SIDEBAR NAVIGATION
  if (isDesktop) {
    return (
      <View
        style={{
          position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 230,
          zIndex: 50,
        }}
        className="h-full bg-white border-r border-[#e5ece7] px-4 py-6 justify-between"
        accessibilityLabel="Desktop primary navigation sidebar"
      >
        {/* Top: Logo & Navigation Links */}
        <View>
          {/* Brand Logo & Name */}
          <TouchableOpacity
            onPress={() => navigation.navigate("index")}
            activeOpacity={0.8}
            className={`flex-row items-center gap-2.5 px-2 mb-8 ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
            accessibilityRole="link"
            accessibilityLabel="Better Life Home"
          >
            <View className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 items-center justify-center">
              <LeafIconSvg size={18} color="#1b7a53" />
            </View>
            <View>
              <AppText weight="black" className="text-base text-neutral-dark tracking-tight leading-none">
                Better Life
              </AppText>
              <AppText weight="bold" className="text-[9px] text-emerald-800 tracking-wider uppercase mt-0.5">
                Wellness & Nutrition
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Navigation Route Items */}
          <View className="flex-col gap-1.5">
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
                  className={`px-3.5 py-2.5 rounded-xl flex-row items-center gap-3 transition-colors ${
                    Platform.OS === "web" ? "cursor-pointer" : ""
                  } ${
                    isFocused
                      ? "bg-[#eaf5ee] border border-emerald-200/60"
                      : "hover:bg-neutral-50/80"
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={`Navigate to ${displayLabel}`}
                >
                  <AnimatedTabIcon
                    name={displayLabel}
                    focused={isFocused}
                    size={19}
                    color={isFocused ? "#166534" : "#64748b"}
                  />
                  <AppText
                    weight={isFocused ? "black" : "semibold"}
                    className={`text-sm ${
                      isFocused ? "text-emerald-900" : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {displayLabel}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom: Upgrade Plan Promo Card */}
        <View className="bg-[#eef6f1] border border-[#dbebe0] rounded-2xl p-3.5 relative overflow-hidden">
          <View className="mb-2">
            <AppText weight="bold" className="text-xs text-emerald-950 leading-snug">
              Stay consistent
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-600 mt-0.5">
              for a healthier you
            </AppText>
          </View>

          {/* Decorative subtle leaf graphic */}
          <View className="flex-row items-center justify-between mt-2 pt-1">
            <TouchableOpacity
              onPress={() => {}}
              className={`w-full py-2 px-3 rounded-full bg-white border border-[#cbe1d3] flex-row items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all ${
                Platform.OS === "web" ? "cursor-pointer" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="Upgrade Plan"
            >
              <CrownIconSvg size={14} color="#f59e0b" />
              <AppText weight="black" className="text-xs text-neutral-dark">
                Upgrade Plan
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 2. MOBILE BOTTOM NAVIGATION
  return (
    <View
      className="w-full bg-white border-t border-[#e2eae4] shadow-sm z-50"
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
      }}
      accessibilityRole="tablist"
      accessibilityLabel="Mobile bottom navigation"
    >
      <View className="flex-row items-center justify-around max-w-[480px] mx-auto w-full px-2">
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
              className="items-center justify-center py-1.5 flex-1 min-h-[48px] active:opacity-75"
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={`Navigate to ${displayLabel}`}
            >
              <AnimatedTabIcon
                name={displayLabel}
                focused={isFocused}
                size={22}
                color={isFocused ? "#1b7a53" : "#94a3b8"}
              />
              <AppText
                weight={isFocused ? "bold" : "medium"}
                className={`text-[11px] mt-1 tracking-tight ${
                  isFocused ? "text-emerald-800" : "text-neutral-400"
                }`}
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
