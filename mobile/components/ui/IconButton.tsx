import React from "react";
import {
  Pressable,
  PressableProps,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AnimationEasings } from "@/constants/AnimationTokens";

export interface IconButtonProps extends Omit<PressableProps, "children"> {
  icon: React.ReactNode;
  size?: number;
  variant?: "default" | "filled" | "outline";
  className?: string;
  accessibilityLabel?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 44,
  variant = "default",
  disabled,
  className,
  style,
  accessibilityLabel = "Button",
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.92, AnimationEasings.pressSpringConfig);
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, AnimationEasings.pressSpringConfig);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "filled":
        return "bg-secondary rounded-full";
      case "outline":
        return "border border-neutral-border rounded-full bg-white";
      case "default":
        return "bg-transparent rounded-full";
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`items-center justify-center ${getVariantStyles()} ${
        disabled ? "opacity-45" : ""
      } ${className || ""}`}
      style={[
        { width: size, height: size, minWidth: 44, minHeight: 44 },
        style as any,
      ]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...props}
    >
      <Animated.View
        style={[
          { alignItems: "center", justifyContent: "center" },
          animatedStyle,
        ]}
        pointerEvents="none"
      >
        {icon}
      </Animated.View>
    </Pressable>
  );
};

