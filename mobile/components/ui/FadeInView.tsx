import React, { useEffect } from "react";
import { ViewProps } from "react-native";
import {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AnimatedView } from "@/lib/nativewindInterop";
import { MotionCurves, MotionDurations } from "@/constants/AnimationTokens";

export interface FadeInViewProps extends ViewProps {
  children: React.ReactNode;
  /** Position in a stagger group (0, 1, 2...). Multiplied by 45ms, capped at 240ms. */
  index?: number;
  /** Explicit delay in ms (overrides index). */
  delay?: number;
  /** Initial downward offset in px; defaults to 8. */
  distance?: number;
  /** Alias for distance (initial downward translateY offset in px). */
  translateY?: number;
  /** Entrance duration in ms; defaults to MotionDurations.enter (320ms). */
  duration?: number;
  className?: string;
}

const easeOut = Easing.bezier(...MotionCurves.out);
const ENTRANCE_SPRING = {
  damping: 26,
  stiffness: 250,
  mass: 0.62,
  overshootClamping: true,
  reduceMotion: ReduceMotion.Never,
};

/**
 * Staggered entrance animation (fade + physical spring upward slide) running on the
 * Reanimated UI thread on both Expo Go (Android/iOS) and Web, while preserving
 * all NativeWind v4 `className` layout rules via `AnimatedView`.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  index = 0,
  delay,
  distance = 8,
  translateY,
  duration = MotionDurations.enter,
  className,
  style,
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const offset = useSharedValue(1);
  const resolvedDistance = translateY !== undefined ? translateY : distance;

  useEffect(() => {
    const startDelay =
      delay !== undefined
        ? delay
        : Math.min(200, Math.max(0, index) * 36);

    const fadeConfig = {
      duration: reduceMotion ? 120 : duration,
      easing: easeOut,
      reduceMotion: ReduceMotion.Never,
    };

    opacity.value = 0;
    offset.value = 1;

    if (startDelay > 0) {
      opacity.value = withDelay(startDelay, withTiming(1, fadeConfig));
      offset.value = withDelay(startDelay, withSpring(0, ENTRANCE_SPRING));
    } else {
      opacity.value = withTiming(1, fadeConfig);
      offset.value = withSpring(0, ENTRANCE_SPRING);
    }

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(offset);
    };
  }, [index, delay, duration, reduceMotion, opacity, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {
        translateY: reduceMotion ? 0 : offset.value * resolvedDistance,
      },
    ],
  }));

  return (
    <AnimatedView
      className={className}
      style={style}
      animatedStyle={animatedStyle}
      {...props}
    >
      {children}
    </AnimatedView>
  );
};
