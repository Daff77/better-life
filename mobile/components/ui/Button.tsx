import React from "react";
import {
  Pressable,
  PressableProps,
  ActivityIndicator,
  View,
  Platform,
  GestureResponderEvent,
} from "react-native";
import { AppText } from "./AppText";
import { Colors, Shadows } from "@/constants/DesignTokens";
import { AnimationScales } from "@/constants/AnimationTokens";
import { CheckIconSvg } from "@/constants/Assets";

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
  const getContainerStyle = () => {
    switch (variant) {
      case "primary":
        return "bg-primary";
      case "secondary":
        return "bg-secondary-soft border border-secondary";
      case "outline":
        return "bg-transparent border border-primary/70";
      case "ghost":
        return "bg-transparent";
      case "social":
        return "bg-white border border-neutral-border";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "text-white";
      case "secondary":
        return "text-primary";
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
        return "min-h-[44px] px-4 rounded-full";
      case "md":
        return "min-h-[48px] px-5 rounded-full";
      case "lg":
        return "min-h-[54px] px-7 rounded-full";
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
      className={`flex-row items-center justify-center min-h-[44px] ${
        Platform.OS === "web"
          ? "transition-colors duration-150 cursor-pointer"
          : ""
      } ${getSizeStyle()} ${getContainerStyle()} ${
        disabled ? "opacity-45" : ""
      } ${className || ""}`}
      style={({ pressed }) => [
        variant === "primary" ? Shadows.button : undefined,
        pressed && !disabled && !loading
          ? { opacity: 0.9, transform: [{ scale: AnimationScales.pressButton }] }
          : undefined,
        typeof style === "function" ? style({ pressed }) : (style as any),
      ]}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: loading }}
      {...props}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === "primary" ? Colors.neutral.white : Colors.primary.DEFAULT}
            size="small"
          />
        ) : success ? (
          <View className="flex-row items-center justify-center gap-x-1.5">
            <CheckIconSvg
              size={18}
              stroke={variant === "primary" ? Colors.neutral.white : Colors.primary.DEFAULT}
              strokeWidth={2.6}
            />
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
      </View>
    </Pressable>
  );
};
