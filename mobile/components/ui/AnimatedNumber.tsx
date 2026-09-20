import React, { useEffect, useState, useRef } from "react";
import { AppText, AppTextProps } from "./AppText";
import { AnimationTimings } from "@/constants/AnimationTokens";

export interface AnimatedNumberProps extends Omit<AppTextProps, "children"> {
  value: number;
  decimals?: number;
  duration?: number;
  formatter?: (val: number) => string;
  animateOnMount?: boolean;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  duration = AnimationTimings.component,
  formatter,
  animateOnMount = true,
  className,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const prevValueRef = useRef(animateOnMount ? 0 : value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    if (startValue === endValue) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Quadratic ease-out for organic numbers count
      const easedProgress = 1 - (1 - progress) * (1 - progress);
      const current = startValue + (endValue - startValue) * easedProgress;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endValue;
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  const formatted = formatter
    ? formatter(displayValue)
    : decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <AppText className={className} {...props}>
      {formatted}
    </AppText>
  );
};

