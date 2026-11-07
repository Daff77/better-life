import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { Colors } from "@/constants/DesignTokens";
import { MotionCurves, MotionDurations } from "@/constants/AnimationTokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showPercent?: boolean;
  textColor?: string;
  labelColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 124,
  strokeWidth = 10,
  color = Colors.primary.DEFAULT,
  backgroundColor = Colors.secondary.DEFAULT,
  label = "Progress",
  showPercent = true,
  textColor,
  labelColor,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    // Ease-out fill: the arc jumps toward the new value first, then settles,
    // so logging a meal reads as immediate feedback.
    animatedProgress.value = withTiming(clampedProgress, {
      duration: MotionDurations.fill,
      easing: Easing.bezier(...MotionCurves.out),
    });
  }, [clampedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (animatedProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  const isCompact = size <= 84;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Active Animated Progress Arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* Center Value & Label */}
      <View pointerEvents="none" className="absolute items-center justify-center">
        {showPercent && (
          <AppText
            weight="black"
            className={isCompact ? "text-base sm:text-lg" : "text-2xl"}
            style={[
              { fontVariant: ["tabular-nums"] },
              textColor ? { color: textColor } : undefined,
            ]}
          >
            {Math.round(clampedProgress)}%
          </AppText>
        )}
        {Boolean(label) && (
          <AppText
            weight="medium"
            className={isCompact ? "text-[9px]" : "text-xs mt-0.5"}
            style={labelColor ? { color: labelColor } : undefined}
          >
            {label}
          </AppText>
        )}
      </View>
    </View>
  );
};

