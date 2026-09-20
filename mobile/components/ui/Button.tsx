import React from "react";
import {
  Pressable,
  PressableProps,
  ActivityIndicator,
  View,
  Platform,
  GestureResponderEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { Colors, Shadows } from "@/constants/DesignTokens";
import {
  AnimationTimings,
  AnimationEasings,
  AnimationScales,
} from "@/constants/AnimationTokens";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "social";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  success?: boolean;
  className?: string;
  onPress?: (event: GestureResponderEvent) => void;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  success = false,
  disabled,
  style,
  className,
  onPress,
  ...props
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(AnimationScales.pressButton, AnimationEasings.pressSpringConfig);
    opacity.value = withTiming(0.92, { duration: AnimationTimings.microFast });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, AnimationEasings.pressSpringConfig);
    opacity.value = withTiming(1, { duration: AnimationTimings.microFast });
  };

  const getContainerStyle = () => {
    switch (variant) {
      case "primary":
        return "bg-primary";
      case "secondary":
        return "bg-secondary";
      case "outline":
        return "bg-transparent border border-primary";
      case "ghost":
        return "bg-transparent";
      case "social":
        return "bg-white border border-neutral-border";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "text-neutral-dark";
      case "secondary":
        return "text-accent-teal";
      case "outline":
        return "text-primary";
      case "ghost":
        return "text-neutral-dark";
      case "social":
        return "text-neutral-dark";
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return "h-[44px] px-3 rounded-lg";
      case "md":
        return "h-[52px] px-4 rounded-xl";
      case "lg":
        return "h-[60px] px-6 rounded-2xl";
    }
  };

  const getTextWeight = () => (variant === "social" ? "semibold" : "bold");

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled || loading) return;
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`flex-row items-center justify-center min-h-[44px] ${
        Platform.OS === "web"
          ? "transition-all duration-150 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          : ""
      } ${getSizeStyle()} ${getContainerStyle()} ${
        disabled ? "opacity-45" : ""
      } ${className || ""}`}
      style={[
        variant === "primary" ? Shadows.button : undefined,
        style as any,
      ]}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: loading }}
      {...props}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          },
          animatedStyle,
        ]}
        pointerEvents="none"
      >
        {loading ? (
          <ActivityIndicator
            color={variant === "primary" ? Colors.neutral.white : Colors.primary.DEFAULT}
            size="small"
          />
        ) : success ? (
          <View className="flex-row items-center justify-center gap-x-1.5">
            <AppText weight="bold" className={`text-base ${getTextColor()}`}>
              ✓
            </AppText>
            <AppText weight={getTextWeight()} className={`text-[16px] ${getTextColor()}`}>
              {title || "Saved"}
            </AppText>
          </View>
        ) : (
          <View className="flex-row items-center justify-center gap-x-2">
            {icon && iconPosition === "left" && icon}
            <AppText weight={getTextWeight()} className={`text-[16px] ${getTextColor()}`}>
              {title}
            </AppText>
            {icon && iconPosition === "right" && icon}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};


