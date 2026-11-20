import React, { useEffect } from "react";
import { LayoutChangeEvent, View, ViewProps } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
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
  onLayout,
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  // Normalize progress between 0 and 100
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const normalized =
    safeProgress > 1
      ? Math.min(100, safeProgress)
      : Math.min(100, Math.max(0, safeProgress * 100));
  const targetRatio = normalized / 100;

  const trackWidthSV = useSharedValue(0);
  const animatedRatio = useSharedValue(reduceMotion ? targetRatio : 0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(animatedRatio);
      animatedRatio.value = targetRatio;
      return;
    }

    animatedRatio.value = withTiming(targetRatio, {
      duration: MotionDurations.fill,
      easing: Easing.bezier(...MotionCurves.out),
    });
    return () => {
      cancelAnimation(animatedRatio);
    };
  }, [targetRatio, animatedRatio, reduceMotion]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && width !== trackWidthSV.value) {
      trackWidthSV.value = width;
    }
    onLayout?.(event);
  };

  // GPU-composited translateX once container width is measured; width% fallback before first layout
  const animatedStyle = useAnimatedStyle(() => {
    const ratio = Math.max(0, Math.min(1, animatedRatio.value));
    const measuredWidth = trackWidthSV.value;
    if (measuredWidth <= 0) {
      return {
        width: `${Math.round(ratio * 100)}%`,
        transform: [{ translateX: 0 }],
      };
    }
    return {
      width: measuredWidth,
      transform: [{ translateX: -measuredWidth * (1 - ratio) }],
    };
  });

  return (
    <View
      onLayout={handleLayout}
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
