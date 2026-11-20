import React, { useEffect } from "react";
import { DimensionValue, StyleProp, ViewStyle } from "react-native";
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AnimatedView } from "@/lib/nativewindInterop";
import { MotionCurves } from "@/constants/AnimationTokens";

export interface SkeletonPulseProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const inOutEase = Easing.bezier(...MotionCurves.inOut);

/**
 * Calm shimmerless skeleton placeholder pulsing gently between 0.45 and 0.88 opacity
 * (static 0.65 opacity when reduced motion is enabled).
 */
export const SkeletonPulse: React.FC<SkeletonPulseProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 12,
  className = "",
  style,
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.65 : 0.48);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = 0.65;
      return;
    }

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.88, { duration: 750, easing: inOutEase }),
        withTiming(0.45, { duration: 750, easing: inOutEase })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView
      animatedStyle={animatedStyle}
      className={className}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#dfe6e1",
        },
        style,
      ]}
    />
  );
};
