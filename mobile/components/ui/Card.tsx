import React from "react";
import { View, Pressable, PressableProps, Platform } from "react-native";
import { AnimationScales } from "@/constants/AnimationTokens";

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
 * - Instant pointer-down response using native press transform.
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

  const baseSurfaceClass = translucent
    ? "bg-white/85 border border-[#e0ede6]/90 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_20px_rgba(20,50,25,0.02)]"
    : elevated
    ? "bg-white border border-[#e0ede6] shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_28px_rgba(20,50,25,0.04)]"
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

  return (
    <Pressable
      onPress={onPress}
      className={`${baseSurfaceClass} rounded-2xl p-4.5 ${
        Platform.OS === "web"
          ? "transition-colors duration-150 hover:border-[#d5dbd7] cursor-pointer select-none"
          : ""
      } ${className || ""}`}
      style={({ pressed }) => [
        pressed ? { opacity: 0.94, transform: [{ scale: AnimationScales.pressCard }] } : undefined,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
};
