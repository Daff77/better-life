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

/**
 * Staggered entrance animation (fade + subtle upward slide) running on the
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
  const progress = useSharedValue(0);
  const resolvedDistance = translateY !== undefined ? translateY : distance;

  useEffect(() => {
    const startDelay =
      delay !== undefined
        ? delay
        : Math.min(240, Math.max(0, index) * MotionDurations.stagger);

    const timingConfig = {
      duration: reduceMotion ? 120 : duration,
      easing: easeOut,
      reduceMotion: ReduceMotion.Never,
    };

    progress.value = 0;
    progress.value =
      startDelay > 0
        ? withDelay(startDelay, withTiming(1, timingConfig))
        : withTiming(1, timingConfig);

    return () => {
      cancelAnimation(progress);
    };
  }, [index, delay, duration, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: reduceMotion ? 0 : (1 - progress.value) * resolvedDistance,
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
