import React, { useEffect, useState, useRef } from "react";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AppText, AppTextProps } from "./AppText";
import { AnimationTimings } from "@/constants/AnimationTokens";

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
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const prevValueRef = useRef(animateOnMount ? 0 : value);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    if (startValue === endValue) return;

    pulse.value = withSequence(
      withTiming(1.04, { duration: 110 }),
      withTiming(1, { duration: 180 })
    );

    let startTime: number | null = null;
    let lastRenderTime = 0;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out for organic number count
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easedProgress;

      if (progress < 1) {
        if (timestamp - lastRenderTime >= 30) {
          lastRenderTime = timestamp;
          setDisplayValue(current);
        }
        animationFrameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endValue;
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      cancelAnimation(pulse);
    };
  }, [value, duration, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
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
