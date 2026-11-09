import React, { useRef, useMemo } from "react";
import { View, PanResponder, useWindowDimensions } from "react-native";
import { Tabs, useRouter } from "expo-router";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  ResponsiveTabBar,
  NAV_DESKTOP_BREAKPOINT,
  NAV_TOPBAR_HEIGHT,
  NAV_DOCK_GUTTER,
} from "@/components/layout/ResponsiveTabBar";
import { isHorizontalScrollActive, TabSwipeSceneContext } from "@/lib/tabSwipeGuard";

const TAB_ROUTES = ["index", "meals", "recipes", "profile"] as const;

export default function TabsLayout() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= NAV_DESKTOP_BREAKPOINT;

  const navStateRef = useRef<{
    index: number;
    routes: Array<{ key: string; name: string }>;
    navigation?: any;
    navigateToTab?: (routeKey: string) => void;
  }>({
    index: 0,
    routes: TAB_ROUTES.map((name) => ({ key: name, name })),
  });

  const translateX = useSharedValue(0);
  const sceneOpacity = useSharedValue(1);

  const navigateByIndex = (targetIdx: number, direction: "next" | "prev") => {
    const { routes, navigation, navigateToTab } = navStateRef.current;
    const targetRoute = routes[targetIdx];
    if (!targetRoute) return;

    if (navigateToTab) {
      navigateToTab(targetRoute.key);
    } else if (navigation?.navigate) {
      navigation.navigate(targetRoute.name);
    } else {
      router.push(
        targetRoute.name === "index"
          ? "/(app)/(tabs)"
          : (`/(app)/(tabs)/${targetRoute.name}` as any)
      );
    }

    // Directional entrance slide for the newly focused tab while keeping bottom tab bar fixed
    translateX.value = direction === "next" ? 28 : -28;
    sceneOpacity.value = 0.88;
    translateX.value = withSpring(0, {
      damping: 24,
      stiffness: 290,
      mass: 0.75,
    });
    sceneOpacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  };

  const resetPosition = () => {
    translateX.value = withSpring(0, {
      damping: 22,
      stiffness: 300,
      mass: 0.7,
    });
    sceneOpacity.value = withTiming(1, { duration: 150 });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
          if (isDesktop || isHorizontalScrollActive()) return false;
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          // Capture deliberate horizontal swipes while allowing vertical scroll and taps
          return absDx > 26 && absDx > absDy * 1.85;
        },
        onPanResponderMove: (_evt, gestureState) => {
          const { index, routes } = navStateRef.current;
          const dx = gestureState.dx;
          const isEdgeSwipe =
            (index === 0 && dx > 0) || (index === routes.length - 1 && dx < 0);

          if (isEdgeSwipe) {
            translateX.value = Math.max(-24, Math.min(24, dx * 0.1));
          } else {
            translateX.value = Math.max(-68, Math.min(68, dx * 0.28));
            sceneOpacity.value = Math.max(0.9, 1 - Math.abs(dx) / 900);
          }
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const { index, routes } = navStateRef.current;
          const { dx, vx } = gestureState;

          const swipeLeftNext = dx < -50 || (dx < -22 && vx < -0.32);
          const swipeRightPrev = dx > 50 || (dx > 22 && vx > 0.32);

          if (swipeLeftNext && index < routes.length - 1) {
            navigateByIndex(index + 1, "next");
          } else if (swipeRightPrev && index > 0) {
            navigateByIndex(index - 1, "prev");
          } else {
            resetPosition();
          }
        },
        onPanResponderTerminate: () => {
          resetPosition();
        },
      }),
    [isDesktop]
  );

  const animatedSceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <TabSwipeSceneContext.Provider value={animatedSceneStyle}>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <Tabs
          tabBar={(props) => {
            const anyProps = props as any;
            const prevIdx = navStateRef.current.index;
            const nextIdx = props.state.index;
            navStateRef.current = {
              index: nextIdx,
              routes: props.state.routes,
              navigation: anyProps.navigation,
              navigateToTab: anyProps.navigateToTab,
            };
            // Subtle directional slide when user taps a different tab on the bottom pill
            if (prevIdx !== nextIdx) {
              translateX.value = nextIdx > prevIdx ? 18 : -18;
              sceneOpacity.value = 0.92;
              translateX.value = withSpring(0, { damping: 24, stiffness: 310, mass: 0.7 });
              sceneOpacity.value = withTiming(1, { duration: 160 });
            }
            return <ResponsiveTabBar {...props} />;
          }}
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
      </View>
    </TabSwipeSceneContext.Provider>
  );
}
