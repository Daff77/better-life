import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { Colors } from "@/constants/DesignTokens";
import { AnimationTimings } from "@/constants/AnimationTokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showPercent?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 124,
  strokeWidth = 10,
  color = Colors.primary.DEFAULT,
  backgroundColor = Colors.secondary.DEFAULT,
  label = "Progress",
  showPercent = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, {
      duration: AnimationTimings.pageFast,
    });
  }, [clampedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (animatedProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

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
          <AppText weight="black" className="text-2xl text-neutral-dark">
            {Math.round(clampedProgress)}%
          </AppText>
        )}
        {Boolean(label) && (
          <AppText weight="bold" className="text-xs text-neutral-muted mt-0.5">
            {label}
          </AppText>
        )}
      </View>
    </View>
  );
};

