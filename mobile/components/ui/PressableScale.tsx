import React from "react";
import { Pressable, PressableProps, Platform, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AnimationEasings } from "@/constants/AnimationTokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  /** Scale on press. 0.97 for buttons, 0.985 for large surfaces. */
  pressedScale?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Pressable that scales down while held. The scale is the press confirmation,
 * so it runs on every tappable surface instead of opacity flicker.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  pressedScale = 0.97,
  className,
  style,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) scale.value = withSpring(pressedScale, AnimationEasings.pressSpringConfig);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, AnimationEasings.pressSpringConfig);
        onPressOut?.(e);
      }}
      className={`${Platform.OS === "web" ? "cursor-pointer select-none" : ""} ${
        disabled ? "opacity-45" : ""
      } ${className || ""}`}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
};

