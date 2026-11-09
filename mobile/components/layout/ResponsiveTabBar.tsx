import React from "react";
import { View, Pressable, useWindowDimensions, Platform, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { LineIcon, LineIconName } from "@/components/ui/LineIcon";
import { FLOAT_SHADOW, SURFACE_SHADOW } from "@/components/ui/Surface";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useAuthStore } from "@/stores/useAuthStore";

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

/** Route name to icon and Indonesian label. */
const TAB_META: Record<string, { icon: LineIconName; label: string }> = {
  index: { icon: "home", label: "Beranda" },
  meals: { icon: "utensils", label: "Makan" },
  recipes: { icon: "book", label: "Resep" },
  profile: { icon: "user", label: "Profil" },
};

/** Layout constants shared with the tabs layout so scenes clear the chrome. */
export const NAV_DESKTOP_BREAKPOINT = 768;
export const NAV_TOPBAR_HEIGHT = 76;
export const NAV_DOCK_GUTTER = 92;

const QUICK_ACTIONS: Array<{ icon: LineIconName; label: string; href: string }> = [
  { icon: "calendar", label: "Rencana makan 7 hari", href: "/(app)/meal-planner" },
  { icon: "chart", label: "Tren nutrisi", href: "/(app)/analytics" },
];

const web = Platform.OS === "web";

export const ResponsiveTabBar: React.FC<ResponsiveTabBarProps> = ({ state, navigation, navigateToTab, insets }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= NAV_DESKTOP_BREAKPOINT;
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const user = useAuthStore((s) => s.user);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const initials = React.useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return "BL";
    const parts = name.split(/\s+/);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
  }, [user?.name]);

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

  const meta = (name: string) => TAB_META[name] ?? { icon: "home" as LineIconName, label: name };
  const fixed = web ? ("fixed" as any) : "absolute";

  /* Tablet and desktop: top bar with a pill tab track, plus a vertical quick-action dock. */
  if (isDesktop) {
    const profileIndex = state.routes.findIndex((r) => r.name === "profile");
    return (
      <>
        <View
          style={{ position: fixed, top: 0, left: 0, right: 0, height: NAV_TOPBAR_HEIGHT, zIndex: 50 }}
          className="bg-canvas flex-row items-center px-6 gap-5"
          accessibilityRole="navigation"
          accessibilityLabel="Navigasi utama"
        >
          <Pressable
            onPress={() => handleTabPress(state.routes[0].key, state.routes[0].name, state.index === 0)}
            className={`flex-row items-center gap-2.5 min-h-[44px] ${web ? "cursor-pointer" : ""}`}
            accessibilityRole="link"
            accessibilityLabel="Better Life, beranda"
          >
            <View className="w-10 h-10 rounded-[13px] bg-primary items-center justify-center">
              <LineIcon name="leaf" size={21} color="#ffffff" strokeWidth={2} />
            </View>
            <AppText weight="bold" className="text-[20px] text-ink" style={{ letterSpacing: -0.4 }}>
              Better Life
            </AppText>
          </Pressable>

          <View className="flex-1 items-center">
            <View
              className="flex-row bg-card border border-line rounded-full p-1 gap-0.5"
              style={{ boxShadow: SURFACE_SHADOW } as ViewStyle}
              accessibilityRole="tablist"
            >
              {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const m = meta(route.name);
                return (
                  <Pressable
                    key={route.key}
                    onPress={() => handleTabPress(route.key, route.name, isFocused)}
                    className={`h-10 px-4 rounded-full flex-row items-center gap-2 ${
                      isFocused ? "bg-block-ink" : web ? "hover:bg-card-2" : ""
                    } ${web ? "cursor-pointer transition-colors duration-150" : ""}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isFocused }}
                    accessibilityLabel={m.label}
                  >
                    <LineIcon name={m.icon} size={17} color={isFocused ? "#f2f6f3" : "#2e3a33"} />
                    <AppText weight="semibold" className={`text-[14px] ${isFocused ? "text-block-on-ink" : "text-ink-2"}`}>
                      {m.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => router.push("/(app)/upgrade")}
              className={`h-11 pl-3 pr-4 rounded-full bg-card border border-line flex-row items-center gap-2 ${
                web ? "cursor-pointer hover:bg-card-2" : ""
              }`}
              style={{ boxShadow: SURFACE_SHADOW } as ViewStyle}
              accessibilityRole="button"
              accessibilityLabel={isPremium ? "Kelola langganan Premium" : "Lihat paket Premium"}
            >
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: isPremium ? "#0e7a52" : "#f3b23c",
                  boxShadow: `0px 0px 0px 3px ${isPremium ? "rgba(14,122,82,0.2)" : "rgba(243,178,60,0.3)"}`,
                } as ViewStyle}
              />
              <AppText weight="semibold" className="text-[13.5px] text-ink">
                {isPremium ? "Premium aktif" : "Coba Premium"}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() =>
                profileIndex >= 0 &&
                handleTabPress(state.routes[profileIndex].key, "profile", state.index === profileIndex)
              }
              className={`w-11 h-11 rounded-full bg-card border border-line items-center justify-center ${
                web ? "cursor-pointer" : ""
              }`}
              style={{ boxShadow: SURFACE_SHADOW } as ViewStyle}
              accessibilityRole="button"
              accessibilityLabel="Buka profil"
            >
              <View className="w-[38px] h-[38px] rounded-full bg-primary-light items-center justify-center">
                <AppText weight="bold" className="text-[12px] text-primary-text">
                  {initials}
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Quick-action dock: destinations that live outside the tabs. */}
        <View
          style={{
            position: fixed,
            left: 20,
            top: 0,
            bottom: 0,
            zIndex: 40,
            justifyContent: "center",
            pointerEvents: "box-none",
          } as ViewStyle}
        >
          <View className="bg-primary rounded-full p-2 gap-1" style={{ boxShadow: FLOAT_SHADOW } as ViewStyle}>
            {QUICK_ACTIONS.map((a) => (
              <View key={a.href}>
                <Pressable
                  onPress={() => router.push(a.href as any)}
                  onHoverIn={() => setHovered(a.href)}
                  onHoverOut={() => setHovered(null)}
                  className={`w-11 h-11 rounded-full items-center justify-center ${
                    web ? "cursor-pointer hover:bg-white/15" : ""
                  }`}
                  accessibilityRole="link"
                  accessibilityLabel={a.label}
                >
                  <LineIcon name={a.icon} size={20} color="#ffffff" />
                </Pressable>
                {hovered === a.href ? <DockTip label={a.label} /> : null}
              </View>
            ))}
            <View className="h-px bg-white/20 mx-2.5 my-1" />
            <View>
              <Pressable
                onPress={() => router.push("/(app)/upgrade")}
                onHoverIn={() => setHovered("premium")}
                onHoverOut={() => setHovered(null)}
                className={`w-11 h-11 rounded-full items-center justify-center ${web ? "cursor-pointer hover:bg-white/15" : ""}`}
                accessibilityRole="link"
                accessibilityLabel="Better Life Premium"
              >
                <LineIcon name="crown" size={20} color="#ffffff" />
                {!isPremium ? (
                  <View
                    className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-block-amber"
                    style={{ boxShadow: "0px 0px 0px 2px #0e7a52" } as ViewStyle}
                  />
                ) : null}
              </Pressable>
              {hovered === "premium" ? <DockTip label={isPremium ? "Premium aktif" : "Better Life Premium"} /> : null}
            </View>
          </View>
        </View>
      </>
    );
  }

  /* Phone: floating emerald dock. Active tab expands into a labelled pill. */
  return (
    <View
      style={{
        position: fixed,
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, 8) + 8,
        alignItems: "center",
        zIndex: 50,
        pointerEvents: "box-none",
      } as ViewStyle}
    >
      <View
        className="flex-row items-center bg-primary rounded-full p-1.5 gap-1"
        style={{ boxShadow: FLOAT_SHADOW } as ViewStyle}
        accessibilityRole="tablist"
        accessibilityLabel="Navigasi utama"
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const m = meta(route.name);
          return (
            <Pressable
              key={route.key}
              onPress={() => handleTabPress(route.key, route.name, isFocused)}
              className={`h-12 rounded-full flex-row items-center justify-center ${
                isFocused ? "bg-white pl-3.5 pr-4 gap-2" : "w-12"
              } ${web ? "cursor-pointer" : ""}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={m.label}
            >
              <LineIcon
                name={m.icon}
                size={20}
                color={isFocused ? "#0e7a52" : "rgba(255,255,255,0.86)"}
                strokeWidth={isFocused ? 2 : 1.7}
              />
              {isFocused ? (
                <AppText weight="semibold" className="text-[14px] text-ink">
                  {m.label}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const DockTip: React.FC<{ label: string }> = ({ label }) => (
  <View
    className="absolute left-[58px] top-[7px] bg-card border border-line rounded-[10px] px-2.5 py-1.5"
    style={{
      pointerEvents: "none",
      boxShadow: "0px 2px 6px rgba(16,22,40,0.08), 0px 24px 50px -26px rgba(16,22,40,0.42)",
    } as ViewStyle}
  >
    <AppText weight="semibold" className="text-[12.5px] text-ink" numberOfLines={1} style={{ width: 170 } as any}>
      {label}
    </AppText>
  </View>
);
