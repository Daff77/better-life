import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { Colors } from "@/constants/DesignTokens";
import {
  AnimationEasings,
  MotionCurves,
  MotionDurations,
} from "@/constants/AnimationTokens";

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
  children?: React.ReactNode;
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
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0));

  const animatedProgress = useSharedValue(reduceMotion ? clampedProgress : 0);
  const ringScale = useSharedValue(1);
  const prevProgressRef = useRef(clampedProgress);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(animatedProgress);
      cancelAnimation(ringScale);
      animatedProgress.value = clampedProgress;
      ringScale.value = 1;
      prevProgressRef.current = clampedProgress;
      return;
    }

    // Ease-out fill: the arc jumps toward the new value first, then settles,
    // so logging a meal reads as immediate feedback.
    animatedProgress.value = withTiming(clampedProgress, {
      duration: MotionDurations.fill,
      easing: Easing.bezier(...MotionCurves.out),
    });

    if (prevProgressRef.current < 100 && clampedProgress >= 100) {
      ringScale.value = withSequence(
        withTiming(1.045, {
          duration: 140,
          easing: Easing.bezier(...MotionCurves.out),
        }),
        withSpring(1, AnimationEasings.celebrationSpringConfig)
      );
    }
    prevProgressRef.current = clampedProgress;

    return () => {
      cancelAnimation(animatedProgress);
      cancelAnimation(ringScale);
    };
  }, [clampedProgress, animatedProgress, ringScale, reduceMotion]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (animatedProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
      // A round linecap paints a stray dot at 0%; hide the arc until it has length.
      strokeOpacity: animatedProgress.value > 0.4 ? 1 : 0,
    };
  });

  const ringPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : ringScale.value }],
  }));

  const isCompact = size <= 84;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Animated.View style={ringPulseStyle}>
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
      </Animated.View>

      {/* Center Value & Label */}
      <View style={{ pointerEvents: "none" }} className="absolute items-center justify-center">
        {children ? (
          children
        ) : (
          <>
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
          </>
        )}
      </View>
    </View>
  );
};

