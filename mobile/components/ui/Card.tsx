import React from "react";
import { View, Pressable, PressableProps, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AnimationEasings, AnimationScales } from "@/constants/AnimationTokens";

interface CardProps extends Omit<PressableProps, "children"> {
  children?: React.ReactNode;
  elevated?: boolean;
  translucent?: boolean;
  className?: string;
  pressable?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Apple Design Material Card
 * - Concentric radii, hairline light-catching border, subtle ambient depth.
 * - Instant pointer-down response using critically damped spring (damping 1.0, zero overshoot).
 */
export const Card: React.FC<CardProps> = ({
  elevated = false,
  translucent = false,
  pressable = false,
  className,
  children,
  style,
  onPress,
  ...props
}) => {
  const isInteractive = pressable || !!onPress;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isInteractive) return;
    scale.value = withSpring(AnimationScales.pressCard, AnimationEasings.pressSpringConfig);
  };

  const handlePressOut = () => {
    if (!isInteractive) return;
    scale.value = withSpring(1, AnimationEasings.pressSpringConfig);
  };

  const baseSurfaceClass = translucent
    ? "bg-white/85 border border-[#e5ece7]/90 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_20px_rgba(20,50,25,0.02)]"
    : elevated
    ? "bg-white border border-[#e5ece7] shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_28px_rgba(20,50,25,0.04)]"
    : "bg-white border border-[#e8edea] shadow-[0_1px_3px_rgba(0,0,0,0.02)]";

  if (!isInteractive) {
    const resolvedStyle = typeof style === "function" ? style({ pressed: false }) : style;
    return (
      <View
        className={`${baseSurfaceClass} rounded-2xl p-4.5 ${className || ""}`}
        style={resolvedStyle}
      >
        {children}
      </View>
    );
  }

  const resolvedStyle = typeof style === "function" ? style({ pressed: false }) : style;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`${baseSurfaceClass} rounded-2xl p-4.5 ${
        Platform.OS === "web"
          ? "transition-colors duration-150 hover:border-[#d6e0d9] cursor-pointer select-none"
          : ""
      } ${className || ""}`}
      style={[animatedStyle, resolvedStyle]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};

