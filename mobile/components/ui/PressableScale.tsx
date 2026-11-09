import React, { useEffect } from "react";
import {
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  Platform,
} from "react-native";
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AnimatedPressable } from "@/lib/nativewindInterop";
import { AnimationEasings } from "@/constants/AnimationTokens";

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Scale target when pressed; defaults to 0.975 for cards/buttons, use 0.96 for small pills. */
  pressedScale?: number;
  /** Opacity target when pressed; defaults to 0.94. */
  pressedOpacity?: number;
  /** Optional subtle hover scale on Web; defaults to 1.006. */
  hoverScale?: number;
}

/**
 * Hardware-accelerated tactile press wrapper powered by Reanimated UI-thread springs
 * and `AnimatedPressable` NativeWind interop.
 * Provides consistent spring press feedback on Expo Go (Android/iOS) and Web.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  className,
  style,
  pressedScale = 0.975,
  pressedOpacity = 0.94,
  hoverScale = 1.006,
  disabled,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...props
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      scale.value = withSpring(pressedScale, AnimationEasings.pressSpringConfig);
      opacity.value = withTiming(pressedOpacity, { duration: 90 });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!disabled) {
      scale.value = withSpring(1, AnimationEasings.pressSpringConfig);
      opacity.value = withTiming(1, { duration: 140 });
    }
    onPressOut?.(e);
  };

  const handleHoverIn = (e: any) => {
    if (!disabled && Platform.OS === "web") {
      scale.value = withSpring(hoverScale, AnimationEasings.microSpringConfig);
    }
    onHoverIn?.(e);
  };

  const handleHoverOut = (e: any) => {
    if (!disabled && Platform.OS === "web") {
      scale.value = withSpring(1, AnimationEasings.microSpringConfig);
    }
    onHoverOut?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      className={`${Platform.OS === "web" ? "cursor-pointer select-none" : ""} ${
        disabled ? "opacity-45" : ""
      } ${className || ""}`}
      style={style}
      animatedStyle={animatedStyle}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};
