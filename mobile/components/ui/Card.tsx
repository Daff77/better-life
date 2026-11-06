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

  const baseSurfaceClass = "bg-white border border-[#eaeaea]";

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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`${baseSurfaceClass} rounded-2xl p-4.5 ${
        Platform.OS === "web"
          ? "transition-all duration-150 hover:border-[#d4d4d8] cursor-pointer select-none"
          : ""
      } ${className || ""}`}
      style={style}
      {...props}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

