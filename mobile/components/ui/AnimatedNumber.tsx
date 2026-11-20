import React, { useEffect, useState, useRef } from "react";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AppText, AppTextProps } from "./AppText";
import {
  AnimationTimings,
  MotionCurves,
  MotionDurations,
} from "@/constants/AnimationTokens";

export interface AnimatedNumberProps extends Omit<AppTextProps, "children"> {
  value: number;
  decimals?: number;
  duration?: number;
  formatter?: (val: number) => string;
  formatValue?: (val: number) => string;
  animateOnMount?: boolean;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  duration = AnimationTimings.component,
  formatter,
  formatValue,
  animateOnMount = true,
  className,
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  const safeValue = Number.isFinite(value) ? value : 0;
  const initialVal = animateOnMount && !reduceMotion ? 0 : safeValue;
  const [displayValue, setDisplayValue] = useState(initialVal);
  const liveValueRef = useRef(initialVal);
  const hasMountedRef = useRef(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      liveValueRef.current = safeValue;
      setDisplayValue(safeValue);
      hasMountedRef.current = true;
      return;
    }

    const startValue = liveValueRef.current;
    const endValue = safeValue;
    if (startValue === endValue) {
      setDisplayValue(endValue);
      hasMountedRef.current = true;
      return;
    }

    // Only pulse when the value changes interactively after initial mount
    if (hasMountedRef.current) {
      const outEase = Easing.bezier(...MotionCurves.out);
      pulse.value = withSequence(
        withTiming(1.035, { duration: 90, easing: outEase }),
        withTiming(1, { duration: MotionDurations.micro, easing: outEase })
      );
    }
    hasMountedRef.current = true;

    let startTime: number | null = null;
    let lastRenderTime = 0;
    let lastRounded =
      decimals > 0 ? Number(startValue.toFixed(decimals)) : Math.round(startValue);
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const safeDuration = Math.max(1, duration);
      const progress = Math.min(1, elapsed / safeDuration);
      // Responsive ease-out matching MotionCurves.out feel
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easedProgress;
      liveValueRef.current = current;

      if (progress < 1) {
        const rounded =
          decimals > 0 ? Number(current.toFixed(decimals)) : Math.round(current);
        if (timestamp - lastRenderTime >= 16 && rounded !== lastRounded) {
          lastRenderTime = timestamp;
          lastRounded = rounded;
          setDisplayValue(current);
        }
        animationFrameId = requestAnimationFrame(step);
      } else {
        liveValueRef.current = endValue;
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      cancelAnimation(pulse);
    };
  }, [safeValue, duration, pulse, decimals, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : pulse.value }],
  }));

  const customFormatter = formatter || formatValue;
  const formatted = customFormatter
    ? customFormatter(displayValue)
    : decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <Animated.View style={animatedStyle}>
      <AppText className={className} {...props}>
        {formatted}
      </AppText>
    </Animated.View>
  );
};
