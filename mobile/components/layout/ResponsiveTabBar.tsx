import React from "react";
import { View, Pressable, useWindowDimensions, Platform } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { AnimatedTabIcon } from "@/components/ui/AnimatedTabIcon";
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

/** Route name to icon key and Indonesian label. Icons stay keyed in English. */
const TAB_META: Record<string, { icon: string; label: string }> = {
  index: { icon: "Home", label: "Beranda" },
  meals: { icon: "Meals", label: "Makan" },
  recipes: { icon: "Recipes", label: "Resep" },
  profile: { icon: "Profile", label: "Profil" },
};

const ACTIVE = "#153e28";
const IDLE = "#6b736c";

export const ResponsiveTabBar: React.FC<ResponsiveTabBarProps> = ({
  state,
  navigation,
  navigateToTab,
  insets,
}) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isPremium = useSubscriptionStore((s) => s.isPremium);

  const handleTabPress = (routeKey: string, routeName: string, isFocused: boolean) => {
    let defaultPrevented = false;
    if (navigation?.emit) {
      const event = navigation.emit({ type: "tabPress", target: routeKey, canPreventDefault: true });
      defaultPrevented = !!event?.defaultPrevented;
    }
    if (!isFocused && !defaultPrevented) {
      if (navigateToTab) navigateToTab(routeKey);
      else if (navigation?.navigate) navigation.navigate(routeName);
      else router.push(routeName === "index" ? "/(app)/(tabs)" : (`/(app)/(tabs)/${routeName}` as any));
    }
  };

  const meta = (name: string) => TAB_META[name] ?? { icon: name, label: name };

  // Desktop / tablet: quiet left rail. Active row gets the sage tint, nothing else.
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
        className="h-full bg-[#faf9f5] border-r border-[#ebe9e2] px-4 py-6 justify-between"
        accessibilityLabel="Navigasi utama"
      >
        <View>
          <View className="flex-row items-center gap-2.5 px-2 mb-8">
            <View className="w-8 h-8 rounded-lg bg-primary items-center justify-center">
              <LeafIconSvg size={17} color="#ffffff" />
            </View>
            <AppText weight="black" className="text-[17px] text-neutral-dark" style={{ letterSpacing: -0.3 }}>
              Better Life
            </AppText>
          </View>

          <View className="gap-1">
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const m = meta(route.name);
              return (
                <Pressable
                  key={route.key}
                  onPress={() => handleTabPress(route.key, route.name, isFocused)}
                  className={`h-11 px-3 rounded-xl flex-row items-center gap-3 ${
                    Platform.OS === "web" ? "cursor-pointer transition-colors duration-150" : ""
                  } ${isFocused ? "bg-primary-light" : "hover:bg-[#f1f0ea]"}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={m.label}
                >
                  <AnimatedTabIcon name={m.icon} focused={isFocused} size={19} color={isFocused ? ACTIVE : IDLE} />
                  <AppText
                    weight={isFocused ? "bold" : "medium"}
                    className={`text-sm ${isFocused ? "text-primary" : "text-neutral-muted"}`}
                  >
                    {m.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/upgrade")}
          className={`rounded-2xl border border-[#ebe9e2] bg-white p-3.5 ${
            Platform.OS === "web" ? "cursor-pointer hover:border-[#d6e0d9] transition-colors duration-150" : ""
          }`}
          accessibilityRole="button"
          accessibilityLabel={isPremium ? "Kelola langganan" : "Lihat paket Premium"}
        >
          <View className="flex-row items-center gap-1.5">
            <CrownIconSvg size={14} color="#b45309" />
            <AppText weight="bold" className="text-[13px] text-neutral-dark">
              {isPremium ? "Premium aktif" : "Better Life Premium"}
            </AppText>
          </View>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-1">
            {isPremium ? "Kelola langganan" : "Rencana makan dan tren 30 hari"}
          </AppText>
        </Pressable>
      </View>
    );
  }

  // Mobile: solid bar. Food photos scrolling behind glass would hurt label legibility.
  return (
    <View
      className="w-full z-50 bg-white border-t border-[#ebe9e2]"
      style={
        {
          position: Platform.OS === "web" ? ("fixed" as any) : undefined,
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        } as any
      }
      accessibilityRole="tablist"
      accessibilityLabel="Navigasi utama"
    >
      <View className="flex-row items-center justify-around max-w-[480px] mx-auto w-full px-2">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const m = meta(route.name);
          return (
            <Pressable
              key={route.key}
              onPress={() => handleTabPress(route.key, route.name, isFocused)}
              className="flex-1 items-center justify-center min-h-[52px]"
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={m.label}
            >
              <View
                className={`w-14 h-8 rounded-full items-center justify-center ${
                  isFocused ? "bg-primary-light" : ""
                }`}
              >
                <AnimatedTabIcon name={m.icon} focused={isFocused} size={20} color={isFocused ? ACTIVE : IDLE} />
              </View>
              <AppText
                weight={isFocused ? "bold" : "medium"}
                className={`text-[11px] mt-0.5 ${isFocused ? "text-primary" : "text-neutral-muted"}`}
              >
                {m.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
