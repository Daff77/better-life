import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { MotionCurves, MotionDurations } from "@/constants/AnimationTokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** Full-circle reference. When the segment sum exceeds it, the ring fills completely. */
  total: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  /** Visual gap between adjacent segments, in px along the arc. */
  gap?: number;
  children?: React.ReactNode;
  accessibilityLabel?: string;
}

const DonutArc: React.FC<{
  progress: SharedValue<number>;
  start: number;
  fraction: number;
  color: string;
  radius: number;
  circumference: number;
  center: number;
  strokeWidth: number;
  gap: number;
  reduceMotion: boolean;
}> = ({
  progress,
  start,
  fraction,
  color,
  radius,
  circumference,
  center,
  strokeWidth,
  gap,
  reduceMotion,
}) => {
  const animatedStart = useSharedValue(start);
  const animatedFraction = useSharedValue(fraction);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(animatedStart);
      cancelAnimation(animatedFraction);
      animatedStart.value = start;
      animatedFraction.value = fraction;
      return;
    }

    const timing = {
      duration: MotionDurations.fill,
      easing: Easing.bezier(...MotionCurves.out),
    };
    animatedStart.value = withTiming(start, timing);
    animatedFraction.value = withTiming(fraction, timing);

    return () => {
      cancelAnimation(animatedStart);
      cancelAnimation(animatedFraction);
    };
  }, [start, fraction, reduceMotion, animatedStart, animatedFraction]);

  const animatedProps = useAnimatedProps(() => {
    const sweep = progress.value;
    const len = Math.max(0, animatedFraction.value * circumference * sweep - gap);
    return {
      strokeDasharray: `${len} ${circumference}`,
      strokeDashoffset: -animatedStart.value * circumference * sweep,
      strokeOpacity: len > 0.5 ? 1 : 0,
    };
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      fill="none"
      animatedProps={animatedProps}
    />
  );
};

/**
 * Multi-segment donut. Each segment is drawn as an arc proportional to `value / total`,
 * sweeping in clockwise from 12 o'clock on mount and morphing smoothly on live updates.
 */
export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  total,
  size = 132,
  strokeWidth = 14,
  trackColor = "#dfe6e1",
  gap = 2.5,
  children,
  accessibilityLabel,
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const visibleCount = segments.filter((s) => s.value > 0).length;
  const sum = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const denom = Math.max(total, sum, 1);
  const effectiveGap = visibleCount > 1 ? gap : 0;

  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(progress);
      progress.value = 1;
      return;
    }

    progress.value = withTiming(1, {
      duration: MotionDurations.fill,
      easing: Easing.bezier(...MotionCurves.out),
    });
    return () => cancelAnimation(progress);
  }, [reduceMotion, progress]);

  let cursor = 0;

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {segments.map((s) => {
          const safeVal = Math.max(0, s.value);
          const fraction = safeVal / denom;
          const start = cursor;
          cursor += fraction;
          return (
            <DonutArc
              key={s.key}
              progress={progress}
              start={start}
              fraction={fraction}
              color={s.color}
              radius={radius}
              circumference={circumference}
              center={center}
              strokeWidth={strokeWidth}
              gap={safeVal > 0 ? effectiveGap : 0}
              reduceMotion={reduceMotion}
            />
          );
        })}
      </Svg>
      <View style={{ pointerEvents: "none" }} className="absolute items-center justify-center">
        {children}
      </View>
    </View>
  );
};
