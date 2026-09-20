import React, { useEffect, useRef } from "react";
import { View, Image, Animated, TouchableOpacity, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText } from "@/components/ui";
import { BrandImages, IconRenderer } from "@/constants/Assets";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  // Animations
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // Track if navigation has occurred to prevent double-navigation
  const hasNavigated = useRef(false);

  const navigateNext = () => {
    if (isLoading || hasNavigated.current) return;
    hasNavigated.current = true;

    if (!isAuthenticated) {
      router.replace("/(auth)/get-started");
    } else if (!onboardingCompleted) {
      router.replace("/(onboarding)");
    } else {
      router.replace("/(app)/(tabs)");
    }
  };

  // Ensure auth is initialized
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Run entrance sequence matching original splash.html CSS animations
    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Auto transition after entrance completes and session is determined
    const timer = setTimeout(() => {
      navigateNext();
    }, 1800);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, onboardingCompleted]);

  return (
    <Pressable
      onPress={navigateNext}
      className="flex-1 bg-white items-center justify-center relative"
      accessibilityRole="button"
      accessibilityLabel="Tap to continue"
    >
      {/* Background Decorative Pattern */}
      <Animated.View
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: bgOpacity,
        }}
        pointerEvents="none"
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
        style={{
          transform: [{ scale: logoScale }],
          opacity: logoOpacity,
          alignItems: "center",
          zIndex: 2,
        }}
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
        style={{
          position: "absolute",
          bottom: 40,
          opacity: hintOpacity,
          alignItems: "center",
          zIndex: 3,
        }}
      >
        <AppText weight="semibold" className="text-sm text-neutral-muted tracking-wide">
          Tap anywhere to continue
        </AppText>
      </Animated.View>
    </Pressable>
  );
}
