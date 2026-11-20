import React, { useEffect, useRef, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { BrandLogo } from "./BrandLogo";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  AnimationEasings,
  MotionCurves,
  MotionDurations,
} from "@/constants/AnimationTokens";

/**
 * Tracks which user has already been greeted during this app process.
 * Module scope resets on every cold start, so the greeting plays:
 *  - once each time the app is opened, and
 *  - again after a fresh login (cleared when the user logs out).
 */
const SESSION_GREETED_KEY = "betterlife_welcome_greeted_user";
let greetedUserKey: string | null = null;

function readSessionGreetedUser(): string | null {
  if (greetedUserKey) return greetedUserKey;
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      return window.sessionStorage.getItem(SESSION_GREETED_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

function writeSessionGreetedUser(key: string | null): void {
  greetedUserKey = key;
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      if (key) {
        window.sessionStorage.setItem(SESSION_GREETED_KEY, key);
      } else {
        window.sessionStorage.removeItem(SESSION_GREETED_KEY);
      }
    } catch {
      // ignore storage quota/privacy mode errors
    }
  }
}

useAuthStore.subscribe((state) => {
  if (!state.user) writeSessionGreetedUser(null);
});

const EASE_OUT = Easing.bezier(...MotionCurves.out);
const HOLD_MS = 900;

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export const WelcomeSplash: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userKey = user ? (user as any).id ?? user.email ?? user.name ?? "user" : null;
  const [visible, setVisible] = useState(
    () => Boolean(userKey) && readSessionGreetedUser() !== userKey
  );
  const reduceMotion = useReducedMotion();
  const dismissedRef = useRef(false);

  const overlay = useSharedValue(1);
  const logo = useSharedValue(0);
  const line1 = useSharedValue(0);
  const line2 = useSharedValue(0);

  const finish = () => setVisible(false);

  const triggerDismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    cancelAnimation(overlay);
    overlay.value = withTiming(
      0,
      { duration: reduceMotion ? 140 : MotionDurations.exit, easing: EASE_OUT },
      (done) => {
        if (done) runOnJS(finish)();
      }
    );
  };

  useEffect(() => {
    if (!visible || !userKey) return;
    dismissedRef.current = false;
    writeSessionGreetedUser(userKey);

    const exitDelay = reduceMotion ? 700 : HOLD_MS + 420;

    if (reduceMotion) {
      logo.value = 1;
      line1.value = 1;
      line2.value = 1;
    } else {
      logo.value = withSpring(1, AnimationEasings.entranceSpringConfig);
      line1.value = withDelay(
        110,
        withTiming(1, { duration: MotionDurations.enter, easing: EASE_OUT })
      );
      line2.value = withDelay(
        175,
        withTiming(1, { duration: MotionDurations.enter, easing: EASE_OUT })
      );
    }

    overlay.value = withSequence(
      withTiming(1, { duration: exitDelay }),
      withTiming(
        0,
        { duration: reduceMotion ? 140 : MotionDurations.exit, easing: EASE_OUT },
        (done) => {
          if (done) runOnJS(finish)();
        }
      )
    );

    return () => {
      cancelAnimation(overlay);
      cancelAnimation(logo);
      cancelAnimation(line1);
      cancelAnimation(line2);
    };
  }, [visible, userKey, reduceMotion, overlay, logo, line1, line2]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
    transform: reduceMotion ? [] : [{ scale: 1 + (1 - overlay.value) * 0.03 }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: reduceMotion ? [] : [{ scale: 0.9 + logo.value * 0.1 }],
  }));
  const line1Style = useAnimatedStyle(() => ({
    opacity: line1.value,
    transform: reduceMotion ? [] : [{ translateY: (1 - line1.value) * 10 }],
  }));
  const line2Style = useAnimatedStyle(() => ({
    opacity: line2.value,
    transform: reduceMotion ? [] : [{ translateY: (1 - line2.value) * 10 }],
  }));

  if (!visible) return null;

  const firstName = user?.name?.split(" ")[0];

  return (
    <Animated.View
      pointerEvents="auto"
      style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
      accessibilityRole="alert"
      accessibilityLabel={`${greetingForNow()}${firstName ? `, ${firstName}` : ""}. Selamat datang di Better Life`}
    >
      <Pressable
        onPress={triggerDismiss}
        style={styles.pressableFill}
        accessibilityRole="button"
        accessibilityLabel="Ketuk untuk melanjutkan"
      >
        <View className="items-center px-8">
          <Animated.View style={logoStyle}>
            <BrandLogo size={72} />
          </Animated.View>
          <Animated.View style={[line1Style, { marginTop: 24 }]}>
            <AppText weight="medium" className="text-[15px] text-muted text-center">
              {greetingForNow()}
            </AppText>
          </Animated.View>
          <Animated.View style={[line2Style, { marginTop: 4 }]}>
            <AppText
              weight="semibold"
              numberOfLines={2}
              className="text-[28px] text-ink text-center"
              style={{ letterSpacing: -0.7, lineHeight: 34 }}
            >
              {firstName ? `Selamat datang, ${firstName}` : "Selamat datang"}
            </AppText>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "#edf1ee",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 1000,
  },
  pressableFill: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
