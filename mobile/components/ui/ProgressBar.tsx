import React, { useEffect } from "react";
import { View, ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/DesignTokens";
import { AnimationTimings } from "@/constants/AnimationTokens";

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
  const normalized = progress > 1 ? Math.min(100, progress) : Math.min(100, Math.max(0, progress * 100));

  const animatedWidth = useSharedValue(normalized);

  useEffect(() => {
    animatedWidth.value = withTiming(normalized, {
      duration: AnimationTimings.component,
    });
  }, [normalized]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View
      style={[{ height, borderRadius: height / 2, backgroundColor }, style]}
      className={`w-full overflow-hidden ${className || ""}`}
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

