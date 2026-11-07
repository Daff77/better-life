import React, { useEffect } from "react";
import { ViewProps } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { MotionCurves, MotionDurations } from "@/constants/AnimationTokens";

export interface FadeInViewProps extends ViewProps {
  /** Position in the stagger sequence. Each step adds MotionDurations.stagger ms. */
  index?: number;
  className?: string;
}

const easeOut = Easing.bezier(...MotionCurves.out);

/**
 * One-time entrance for screen sections: 8px rise plus fade, staggered.
 * Purpose: on first load the eye follows the order of the content.
 * With reduced motion enabled the rise is dropped and only opacity remains.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  index = 0,
  style,
  children,
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * MotionDurations.stagger,
      withTiming(1, {
        duration: MotionDurations.enter,
        easing: easeOut,
        reduceMotion: ReduceMotion.Never,
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * 8 }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
};

