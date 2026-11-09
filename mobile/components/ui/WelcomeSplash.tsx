import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  Easing,
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

/**
 * Tracks which user has already been greeted during this app process.
 * Module scope resets on every cold start, so the greeting plays:
 *  - once each time the app is opened, and
 *  - again after a fresh login (cleared when the user logs out).
 */
let greetedUserKey: string | null = null;

useAuthStore.subscribe((state) => {
  if (!state.user) greetedUserKey = null;
});

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const HOLD_MS = 1400;

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
  const [visible, setVisible] = useState(() => Boolean(userKey) && greetedUserKey !== userKey);
  const reduceMotion = useReducedMotion();

  const overlay = useSharedValue(1);
  const logo = useSharedValue(0);
  const line1 = useSharedValue(0);
  const line2 = useSharedValue(0);

  useEffect(() => {
    if (!visible || !userKey) return;
    greetedUserKey = userKey;

    const finish = () => setVisible(false);
    const exitDelay = reduceMotion ? 900 : HOLD_MS + 500;

    if (reduceMotion) {
      logo.value = 1;
      line1.value = 1;
      line2.value = 1;
    } else {
      logo.value = withSpring(1, { damping: 14, stiffness: 160, mass: 0.8 });
      line1.value = withDelay(180, withTiming(1, { duration: 420, easing: EASE_OUT }));
      line2.value = withDelay(320, withTiming(1, { duration: 420, easing: EASE_OUT }));
    }

    overlay.value = withSequence(
      withTiming(1, { duration: exitDelay }),
      withTiming(0, { duration: reduceMotion ? 160 : 320, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(finish)();
      })
    );
  }, [visible, userKey, reduceMotion, overlay, logo, line1, line2]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
    transform: [{ scale: 1 + (1 - overlay.value) * 0.04 }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ scale: 0.7 + logo.value * 0.3 }],
  }));
  const line1Style = useAnimatedStyle(() => ({
    opacity: line1.value,
    transform: [{ translateY: (1 - line1.value) * 14 }],
  }));
  const line2Style = useAnimatedStyle(() => ({
    opacity: line2.value,
    transform: [{ translateY: (1 - line2.value) * 14 }],
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
      <View className="items-center px-8">
        <Animated.View style={logoStyle}>
          <BrandLogo size={72} />
        </Animated.View>
        <Animated.View style={line1Style} className="mt-6">
          <AppText weight="medium" className="text-[15px] text-muted text-center">
            {greetingForNow()}
          </AppText>
        </Animated.View>
        <Animated.View style={line2Style} className="mt-1">
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
});
