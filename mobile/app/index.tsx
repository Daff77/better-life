import React, { useEffect, useRef } from "react";
import { Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui";
import { BrandImages, IconRenderer } from "@/constants/Assets";
import { MotionCurves } from "@/constants/AnimationTokens";
import { useAuthStore } from "@/stores/useAuthStore";

const easeOut = Easing.bezier(...MotionCurves.out);

const SPLASH_SEEN_KEY = "betterlife_entry_splash_seen";

function hasSeenEntrySplash(): boolean {
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      return window.sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  }
  return false;
}

function markEntrySplashSeen(): void {
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }
}

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);

  // Reanimated shared values running on the UI thread
  const logoScale = useSharedValue(0.88);
  const logoOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  // Track if navigation has occurred to prevent double-navigation
  const hasNavigated = useRef(false);

  const navigateNext = () => {
    if (isLoading || hasNavigated.current) return;
    hasNavigated.current = true;
    markEntrySplashSeen();

    if (!isAuthenticated) {
      router.replace("/(auth)/get-started");
    } else if (!onboardingCompleted) {
      router.replace("/(onboarding)");
    } else {
      router.replace("/(app)/(tabs)");
    }
  };

  useEffect(() => {
    // Run entrance sequence matching original splash.html CSS animations
    bgOpacity.value = withTiming(1, { duration: 600, easing: easeOut });
    logoScale.value = withDelay(
      150,
      withSpring(1, { damping: 16, stiffness: 180, mass: 0.9 })
    );
    logoOpacity.value = withDelay(
      150,
      withTiming(1, { duration: 500, easing: easeOut })
    );
    hintOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 400, easing: easeOut })
    );

    return () => {
      cancelAnimation(bgOpacity);
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(hintOpacity);
    };
  }, [bgOpacity, hintOpacity, logoOpacity, logoScale]);

  useEffect(() => {
    if (isLoading) return;

    const delayMs = hasSeenEntrySplash() ? 0 : 950;
    const timer = setTimeout(() => {
      navigateNext();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, onboardingCompleted]);

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  return (
    <Pressable
      onPress={navigateNext}
      className="flex-1 bg-canvas items-center justify-center relative"
      accessibilityRole="button"
      accessibilityLabel="Ketuk untuk melanjutkan"
    >
      {/* Background Decorative Pattern */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          },
          bgAnimatedStyle,
        ]}
      >
        <IconRenderer
          name="Group290"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        />
      </Animated.View>

      {/* Brand Logo & Name */}
      <Animated.View
        style={[
          {
            alignItems: "center",
            zIndex: 2,
          },
          logoAnimatedStyle,
        ]}
      >
        <Image
          source={BrandImages.logoPng}
          style={{ width: 192, height: 192 }}
          resizeMode="contain"
          accessibilityLabel="Better Life Logo"
        />
      </Animated.View>

      {/* Tap hint text matching original prototype */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 40,
            alignItems: "center",
            zIndex: 3,
          },
          hintAnimatedStyle,
        ]}
      >
        <AppText weight="semibold" className="text-sm text-muted tracking-wide">
          Ketuk di mana saja untuk mulai
        </AppText>
      </Animated.View>
    </Pressable>
  );
}
