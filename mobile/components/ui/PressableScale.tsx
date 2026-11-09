import React, { useState } from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from "react-native";

export interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Scale target when pressed; defaults to 0.98 for cards/rows, use 0.96 for small pills. */
  pressedScale?: number;
}

/**
 * Tactile press wrapper using core React Native Pressable so NativeWind v4
 * className layout styles (flex, width, padding, border, background) resolve
 * deterministically on both Native Android/iOS and Web without colliding with
 * Reanimated style descriptors.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  className,
  style,
  pressedScale = 0.98,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const [pressed, setPressed] = useState(false);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      setPressed(true);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    setPressed(false);
    onPressOut?.(e);
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={className}
      style={[
        style,
        pressed && !disabled
          ? { transform: [{ scale: pressedScale }], opacity: 0.92 }
          : null,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
};
