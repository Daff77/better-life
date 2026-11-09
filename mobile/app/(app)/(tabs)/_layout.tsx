import React, { useRef, useMemo } from "react";
import { View, PanResponder, useWindowDimensions } from "react-native";
import { Tabs, useRouter } from "expo-router";
import {
  Easing,
  cancelAnimation,
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

const SETTLE_SPRING = {
  damping: 28,
  stiffness: 270,
  mass: 0.6,
  overshootClamping: true,
};

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

  // Prevents double-triggering the entrance animation when a swipe already started it
  const swipeHandledIndexRef = useRef<number | null>(null);
  const dragStartDxRef = useRef<number>(0);

  const translateX = useSharedValue(0);
  const sceneOpacity = useSharedValue(1);
  const sceneScale = useSharedValue(1);

  const animateSceneArrival = (direction: "next" | "prev", distance: number, velocity = 0) => {
    cancelAnimation(translateX);
    cancelAnimation(sceneOpacity);
    cancelAnimation(sceneScale);

    translateX.value = direction === "next" ? distance : -distance;
    sceneOpacity.value = 0.86;
    sceneScale.value = 0.992;

    translateX.value = withSpring(0, {
      ...SETTLE_SPRING,
      velocity,
    });
    sceneOpacity.value = withTiming(1, {
      duration: 210,
      easing: Easing.out(Easing.cubic),
    });
    sceneScale.value = withSpring(1, SETTLE_SPRING);
  };

  const navigateByIndex = (targetIdx: number, direction: "next" | "prev", velocityPx = 0) => {
    const { routes, navigation, navigateToTab } = navStateRef.current;
    const targetRoute = routes[targetIdx];
    if (!targetRoute) return;

    swipeHandledIndexRef.current = targetIdx;

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

    animateSceneArrival(direction, Math.min(44, Math.round(width * 0.1)), velocityPx);
  };

  const resetPosition = () => {
    cancelAnimation(translateX);
    cancelAnimation(sceneOpacity);
    cancelAnimation(sceneScale);

    translateX.value = withSpring(0, SETTLE_SPRING);
    sceneOpacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    sceneScale.value = withSpring(1, SETTLE_SPRING);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
          if (isDesktop || isHorizontalScrollActive()) return false;
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          // Smooth early capture for horizontal gestures while preserving vertical scroll
          return absDx > 14 && absDx > absDy * 1.45;
        },
        onPanResponderGrant: (_evt, gestureState) => {
          dragStartDxRef.current = gestureState.dx;
          cancelAnimation(translateX);
          cancelAnimation(sceneOpacity);
          cancelAnimation(sceneScale);
        },
        onPanResponderMove: (_evt, gestureState) => {
          const { index, routes } = navStateRef.current;
          // Subtract initial capture offset so the screen starts moving from 0px without jumping
          const effectiveDx = gestureState.dx - dragStartDxRef.current;
          const isEdgeSwipe =
            (index === 0 && effectiveDx > 0) ||
            (index === routes.length - 1 && effectiveDx < 0);

          if (isEdgeSwipe) {
            // Soft hyperbolic rubber-band resistance at the first and last tab edges
            translateX.value = 22 * Math.tanh(effectiveDx / 180);
            sceneOpacity.value = 1;
            sceneScale.value = 1;
          } else {
            // Smooth continuous damping that follows the finger without hitting a hard wall
            const maxDrag = Math.min(110, width * 0.26);
            translateX.value = maxDrag * Math.tanh(effectiveDx / (width * 0.52));
            sceneOpacity.value = Math.max(0.88, 1 - Math.abs(effectiveDx) / 1400);
            sceneScale.value = Math.max(0.988, 1 - Math.abs(effectiveDx) / 4200);
          }
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const { index, routes } = navStateRef.current;
          const effectiveDx = gestureState.dx - dragStartDxRef.current;
          const { vx } = gestureState;

          const swipeLeftNext = effectiveDx < -42 || (effectiveDx < -16 && vx < -0.26);
          const swipeRightPrev = effectiveDx > 42 || (effectiveDx > 16 && vx > 0.26);

          if (swipeLeftNext && index < routes.length - 1) {
            navigateByIndex(index + 1, "next", vx * 90);
          } else if (swipeRightPrev && index > 0) {
            navigateByIndex(index - 1, "prev", vx * 90);
          } else {
            resetPosition();
          }
        },
        onPanResponderTerminate: () => {
          resetPosition();
        },
      }),
    [isDesktop, width]
  );

  const animatedSceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value,
    transform: [
      { translateX: translateX.value },
      { scale: sceneScale.value },
    ],
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
            // Only trigger tap-slide when the tab change was NOT already animated by a finger swipe
            if (prevIdx !== nextIdx) {
              if (swipeHandledIndexRef.current === nextIdx) {
                swipeHandledIndexRef.current = null;
              } else {
                swipeHandledIndexRef.current = null;
                animateSceneArrival(nextIdx > prevIdx ? "next" : "prev", 20);
              }
            }
            return <ResponsiveTabBar {...props} />;
          }}
          screenOptions={{
            headerShown: false,
            sceneStyle: {
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
