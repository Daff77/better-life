import React, { useEffect, useRef } from "react";
import { Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui";
import { BrandImages } from "@/constants/Assets";
import {
  AnimationEasings,
  MotionCurves,
  MotionDurations,
} from "@/constants/AnimationTokens";
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
  const reduceMotion = useReducedMotion();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);

  // Reanimated shared values running on the UI thread
  const logoScale = useSharedValue(0.92);
  const logoOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

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
    if (reduceMotion) {
      logoScale.value = 1;
      logoOpacity.value = withTiming(1, { duration: 120, easing: easeOut });
      hintOpacity.value = withDelay(
        200,
        withTiming(1, { duration: MotionDurations.micro, easing: easeOut })
      );
    } else {
      logoScale.value = withDelay(
        80,
        withSpring(1, AnimationEasings.entranceSpringConfig)
      );
      logoOpacity.value = withDelay(
        80,
        withTiming(1, { duration: 320, easing: easeOut })
      );
      hintOpacity.value = withDelay(
        560,
        withTiming(1, { duration: 280, easing: easeOut })
      );
    }

    return () => {
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(hintOpacity);
    };
  }, [hintOpacity, logoOpacity, logoScale, reduceMotion]);

  useEffect(() => {
    if (isLoading) return;

    const delayMs = hasSeenEntrySplash() ? 0 : 950;
    const timer = setTimeout(() => {
      navigateNext();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, onboardingCompleted]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: reduceMotion ? [] : [{ scale: logoScale.value }],
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
          source={BrandImages.wordmarkPng}
          style={{ width: 248, height: 82 }}
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
