import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
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
}> = ({ progress, start, fraction, color, radius, circumference, center, strokeWidth, gap }) => {
  const animatedProps = useAnimatedProps(() => {
    const len = Math.max(0, fraction * circumference * progress.value - gap);
    return {
      strokeDasharray: `${len} ${circumference}`,
      strokeDashoffset: -start * circumference * progress.value,
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
 * sweeping in clockwise from 12 o'clock with an ease-out fill.
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
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const visible = segments.filter((s) => s.value > 0);
  const sum = visible.reduce((acc, s) => acc + s.value, 0);
  const denom = Math.max(total, sum, 1);
  const effectiveGap = visible.length > 1 ? gap : 0;

  const progress = useSharedValue(0);
  const signature = visible.map((s) => `${s.key}:${Math.round(s.value)}`).join("|") + `/${denom}`;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: MotionDurations.fill,
      easing: Easing.bezier(...MotionCurves.out),
    });
    return () => cancelAnimation(progress);
  }, [signature, progress]);

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
        {visible.map((s) => {
          const fraction = s.value / denom;
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
              gap={effectiveGap}
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
