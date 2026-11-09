import React from "react";
import { View, PressableProps, StyleProp, ViewStyle } from "react-native";
import { PressableScale } from "./PressableScale";
import { AnimationScales } from "@/constants/AnimationTokens";

interface CardProps extends Omit<PressableProps, "children" | "style"> {
  children?: React.ReactNode;
  elevated?: boolean;
  translucent?: boolean;
  className?: string;
  pressable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Apple Design Material Card
 * - Concentric radii, hairline light-catching border, subtle ambient depth.
 * - Instant pointer-down response using Reanimated UI-thread spring transform.
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
    ? "bg-white/85 border border-[#e0ede6]/90"
    : elevated
    ? "bg-white border border-[#e0ede6]"
    : "bg-white border border-[#e8edea]";

  if (!isInteractive) {
    return (
      <View
        className={`${baseSurfaceClass} rounded-2xl p-4.5 ${className || ""}`}
        style={style}
      >
        {children}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={AnimationScales.pressCard}
      className={`${baseSurfaceClass} rounded-2xl p-4.5 ${className || ""}`}
      style={style}
      {...props}
    >
      {children}
    </PressableScale>
  );
};
