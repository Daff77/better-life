import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { AnimatedTabIcon } from "@/components/ui/AnimatedTabIcon";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { CrownIconSvg, LeafIconSvg } from "@/constants/Assets";

export interface ResponsiveTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors: Record<string, { options: any }>;
  navigation?: any;
  navigateToTab?: (routeKey: string) => void;
  emitter?: any;
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
  navigateToTab,
  insets,
}) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const user = useAuthStore((state) => state.user);
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  const handleTabPress = (routeKey: string, routeName: string, isFocused: boolean) => {
    let defaultPrevented = false;
    if (navigation?.emit) {
      const event = navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      });
      defaultPrevented = !!event?.defaultPrevented;
    }

    if (!isFocused && !defaultPrevented) {
      if (navigateToTab) {
        navigateToTab(routeKey);
      } else if (navigation?.navigate) {
        navigation.navigate(routeName);
      } else {
        router.push(routeName === "index" ? "/(app)/(tabs)" : (`/(app)/(tabs)/${routeName}` as any));
      }
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
        className="h-full bg-white border-r border-[#e5ece7] px-4 py-6 justify-between shadow-[2px_0_12px_rgba(20,50,25,0.02)]"
        accessibilityLabel="Desktop primary navigation sidebar"
      >
        {/* Top: Brand Logo & Navigation Links */}
        <View>
          <TouchableOpacity
            onPress={() => {
              if (navigation?.navigate) {
                navigation.navigate("index");
              } else {
                router.push("/(app)/(tabs)");
              }
            }}
            activeOpacity={0.8}
            className={`flex-row items-center gap-2.5 px-2 mb-8 ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
            accessibilityRole="link"
            accessibilityLabel="Better Life Home"
          >
            <View className="w-8 h-8 rounded-xl bg-[#eaf4ed] border border-[#d2e7d7] items-center justify-center shadow-2xs">
              <LeafIconSvg size={18} color="#1b5e37" />
            </View>
            <View>
              <AppText weight="black" className="text-base text-[#14261c] tracking-tight leading-none">
                Better Life
              </AppText>
              <AppText weight="bold" className="text-[9px] text-[#1b5e37] tracking-wider uppercase mt-1">
                Nutrisi & Vitalitas
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
                      ? "bg-[#eaf4ed] border border-[#d2e7d7]"
                      : "hover:bg-[#f6f9f7]"
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={`Navigate to ${displayLabel}`}
                >
                  <AnimatedTabIcon
                    name={displayLabel}
                    focused={isFocused}
                    size={19}
                    color={isFocused ? "#1b5e37" : "#7d8c82"}
                  />
                  <AppText
                    weight={isFocused ? "bold" : "medium"}
                    className={`text-sm ${
                      isFocused ? "text-[#1b5e37]" : "text-[#5a625b]"
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
        <View className="bg-[#f7faf8] border border-[#e5ece7] rounded-2xl p-3.5 relative overflow-hidden">
          <View className="mb-2">
            <View className="flex-row items-center gap-1.5">
              <CrownIconSvg size={14} color="#b45309" />
              <AppText weight="bold" className="text-xs text-[#14261c] leading-snug">
                {isPremium ? "Premium Aktif" : "Better Life Plus"}
              </AppText>
            </View>
            <AppText weight="medium" className="text-[11px] text-neutral-muted mt-0.5">
              {isPremium ? "Semua fitur terbuka" : "Meal plan & analitik 30D"}
            </AppText>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(app)/upgrade")}
            className={`w-full py-2 px-3 rounded-xl bg-white border border-[#dce8e0] flex-row items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all ${
              Platform.OS === "web" ? "cursor-pointer hover:bg-[#fafcfa]" : ""
            }`}
            accessibilityRole="button"
            accessibilityLabel={isPremium ? "Kelola Langganan" : "Upgrade Member"}
          >
            <AppText weight="bold" className="text-xs text-[#1b5e37]">
              {isPremium ? "Kelola Status" : "Lihat Paket"}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. MOBILE BOTTOM NAVIGATION (Apple Translucent Frosted Glass Bar)
  return (
    <View
      className="w-full z-50"
      style={
        {
          position: Platform.OS === "web" ? ("fixed" as any) : undefined,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Platform.OS === "web" ? "rgba(255, 255, 255, 0.88)" : "#ffffff",
          backdropFilter: Platform.OS === "web" ? "blur(20px) saturate(180%)" : undefined,
          WebkitBackdropFilter: Platform.OS === "web" ? "blur(20px) saturate(180%)" : undefined,
          borderTopWidth: 1,
          borderTopColor: "rgba(229, 236, 231, 0.85)",
          boxShadow: "0 -4px 20px rgba(20, 50, 25, 0.03)",
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
        } as any
      }
      accessibilityRole="tablist"
      accessibilityLabel="Mobile bottom navigation"
    >
      <View className="flex-row items-center justify-around max-w-[480px] mx-auto w-full px-3">
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
              activeOpacity={0.75}
              className={`items-center justify-center py-1.5 px-3.5 rounded-2xl min-h-[46px] transition-all active:scale-[0.96] ${
                isFocused
                  ? "bg-[#eaf4ed] border border-[#d2e7d7]/80 shadow-2xs"
                  : Platform.OS === "web"
                  ? "hover:bg-neutral-100/50"
                  : ""
              }`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={`Navigasi ke ${displayLabel}`}
            >
              <AnimatedTabIcon
                name={displayLabel}
                focused={isFocused}
                size={20}
                color={isFocused ? "#1b5e37" : "#7d8c82"}
              />
              <AppText
                weight={isFocused ? "bold" : "medium"}
                className={`text-[11px] mt-0.5 tracking-tight ${
                  isFocused ? "text-[#1b5e37]" : "text-neutral-muted"
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
