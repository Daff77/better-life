import React, { useEffect } from "react";
import { ViewProps } from "react-native";
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AnimatedView } from "@/lib/nativewindInterop";
import {
  AnimationEasings,
  MotionCurves,
  MotionDurations,
} from "@/constants/AnimationTokens";

export interface FadeInViewProps extends ViewProps {
  children: React.ReactNode;
  /** Position in a stagger group (0, 1, 2...). Multiplied by 35ms, capped at 180ms. */
  index?: number;
  /** Explicit delay in ms (overrides index). */
  delay?: number;
  /** Initial downward offset in px; defaults to 8. */
  distance?: number;
  /** Alias for distance (initial downward translateY offset in px). */
  translateY?: number;
  /** Initial horizontal offset in px (e.g. for directional step slides); defaults to 0. */
  translateX?: number;
  /** Entrance duration in ms; defaults to MotionDurations.enter (260ms). */
  duration?: number;
  className?: string;
}

const easeOut = Easing.bezier(...MotionCurves.out);

/**
 * Staggered entrance animation (fade + physical spring slide) running on the
 * Reanimated UI thread on both Expo Go (Android/iOS) and Web, while preserving
 * all NativeWind v4 `className` layout rules via `AnimatedView`.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  index = 0,
  delay,
  distance = 8,
  translateY,
  translateX = 0,
  duration = MotionDurations.enter,
  className,
  style,
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const offset = useSharedValue(reduceMotion ? 0 : 1);
  const resolvedDistance = translateY !== undefined ? translateY : distance;

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(offset);
      offset.value = 0;
      opacity.value = withTiming(1, {
        duration: Math.min(duration, MotionDurations.micro),
        easing: easeOut,
      });
      return () => {
        cancelAnimation(opacity);
        cancelAnimation(offset);
      };
    }

    const startDelay =
      delay !== undefined
        ? delay
        : Math.min(180, Math.max(0, index) * MotionDurations.stagger);

    const fadeConfig = {
      duration,
      easing: easeOut,
    };

    opacity.value = 0;
    offset.value = 1;

    if (startDelay > 0) {
      opacity.value = withDelay(startDelay, withTiming(1, fadeConfig));
      offset.value = withDelay(
        startDelay,
        withSpring(0, AnimationEasings.entranceSpringConfig)
      );
    } else {
      opacity.value = withTiming(1, fadeConfig);
      offset.value = withSpring(0, AnimationEasings.entranceSpringConfig);
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
        translateX: reduceMotion ? 0 : offset.value * translateX,
      },
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
