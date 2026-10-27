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
        className="h-full bg-[#fcfbf9] border-r border-[#eae8e1] px-4 py-6 justify-between"
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
            <View className="w-8 h-8 rounded-lg bg-[#eaf2ec] border border-[#d6e4db] items-center justify-center">
              <LeafIconSvg size={18} color="#153e28" />
            </View>
            <View>
              <AppText weight="bold" className="text-base text-neutral-dark tracking-tight leading-none">
                Better Life
              </AppText>
              <AppText weight="bold" className="text-[9px] text-[#2c5840] tracking-wider uppercase mt-0.5">
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
                      ? "bg-[#eef4f0] border border-[#d6e4db]"
                      : "hover:bg-[#f4f3ed]"
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={`Navigate to ${displayLabel}`}
                >
                  <AnimatedTabIcon
                    name={displayLabel}
                    focused={isFocused}
                    size={19}
                    color={isFocused ? "#153e28" : "#6c746e"}
                  />
                  <AppText
                    weight={isFocused ? "bold" : "medium"}
                    className={`text-sm ${
                      isFocused ? "text-[#153e28]" : "text-neutral-muted hover:text-neutral-dark"
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
        <View className="bg-[#f2f6f3] border border-[#dce8e0] rounded-2xl p-3.5 relative overflow-hidden">
          <View className="mb-2">
            <AppText weight="bold" className="text-xs text-neutral-dark leading-snug">
              Stay consistent
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
              for a healthier you
            </AppText>
          </View>

          {/* Upgrade Plan button */}
          <View className="flex-row items-center justify-between mt-2 pt-1">
            <TouchableOpacity
              onPress={() => {}}
              className={`w-full py-2 px-3 rounded-full bg-white border border-[#d0ded5] flex-row items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-95 transition-all ${
                Platform.OS === "web" ? "cursor-pointer" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="Upgrade Plan"
            >
              <CrownIconSvg size={14} color="#b45309" />
              <AppText weight="bold" className="text-xs text-neutral-dark">
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
      className="w-full bg-[#fcfbf9] border-t border-[#eae8e1] shadow-xs z-50"
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
                color={isFocused ? "#153e28" : "#8a928c"}
              />
              <AppText
                weight={isFocused ? "bold" : "medium"}
                className={`text-[11px] mt-1 tracking-tight ${
                  isFocused ? "text-[#153e28]" : "text-neutral-muted"
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
