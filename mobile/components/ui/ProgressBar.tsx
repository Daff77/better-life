import React, { useEffect } from "react";
import { View, ViewProps } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/DesignTokens";
import { MotionCurves, MotionDurations } from "@/constants/AnimationTokens";

export interface ProgressBarProps extends ViewProps {
  progress: number; // 0 to 1 or 0 to 100
  color?: string;
  backgroundColor?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = Colors.primary.DEFAULT,
  backgroundColor = Colors.secondary.DEFAULT,
  height = 6,
  className,
  style,
  ...props
}) => {
  // Normalize progress between 0 and 100
  const normalized =
    progress > 1
      ? Math.min(100, progress)
      : Math.min(100, Math.max(0, progress * 100));

  const animatedPct = useSharedValue(0);

  useEffect(() => {
    animatedPct.value = withTiming(normalized, {
      duration: MotionDurations.fill,
      easing: Easing.bezier(...MotionCurves.out),
    });
    return () => {
      cancelAnimation(animatedPct);
    };
  }, [normalized, animatedPct]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, animatedPct.value))}%`,
  }));

  return (
    <View
      style={[{ height, borderRadius: height / 2, backgroundColor }, style]}
      className={`w-full overflow-hidden ${className || ""}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(normalized) }}
      {...props}
    >
      <Animated.View
        style={[
          {
            backgroundColor: color,
            height: "100%",
            borderRadius: height / 2,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};
