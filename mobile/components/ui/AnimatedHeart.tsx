import React, { useEffect, useRef } from "react";
import Svg, { Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AnimationEasings } from "@/constants/AnimationTokens";

export interface AnimatedHeartProps {
  filled: boolean;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  children?: React.ReactNode;
}

/**
 * Tactile heart toggle that pops softly only when transitioning to favorited (`false -> true`),
 * respecting system reduced-motion preferences.
 */
export const AnimatedHeart: React.FC<AnimatedHeartProps> = ({
  filled,
  size = 18,
  activeColor = "#e11d48",
  inactiveColor = "#64748b",
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const prevFilledRef = useRef(filled);

  useEffect(() => {
    const wasFilled = prevFilledRef.current;
    prevFilledRef.current = filled;

    if (reduceMotion) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }

    if (!wasFilled && filled) {
      scale.value = withSequence(
        withSpring(1.24, AnimationEasings.celebrationSpringConfig),
        withSpring(1, AnimationEasings.microSpringConfig)
      );
    } else if (wasFilled && !filled) {
      scale.value = withSequence(
        withTiming(0.92, { duration: 70 }),
        withSpring(1, AnimationEasings.microSpringConfig)
      );
    }

    return () => {
      cancelAnimation(scale);
    };
  }, [filled, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : scale.value }],
  }));

  return (
    <Animated.View
      style={[{ alignItems: "center", justifyContent: "center" }, animatedStyle]}
    >
      {children ?? (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 20.6C12 20.6 3.5 14.9 3.5 8.9C3.5 6.08 5.65 4 8.35 4C10 4 11.4 4.82 12 6.02C12.6 4.82 14 4 15.65 4C18.35 4 20.5 6.08 20.5 8.9C20.5 14.9 12 20.6 12 20.6Z"
            fill={filled ? activeColor : "none"}
            stroke={filled ? activeColor : inactiveColor}
            strokeWidth={1.85}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </Animated.View>
  );
};
