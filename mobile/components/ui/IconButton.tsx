import React from "react";
import {
  PressableProps,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { PressableScale } from "./PressableScale";

export interface IconButtonProps extends Omit<PressableProps, "children" | "style"> {
  icon: React.ReactNode;
  size?: number;
  variant?: "default" | "filled" | "outline";
  className?: string;
  style?: StyleProp<ViewStyle>;
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
    <PressableScale
      pressedScale={0.94}
      className={`items-center justify-center ${getVariantStyles()} ${className || ""}`}
      style={[
        { width: size, height: size, minWidth: 44, minHeight: 44 },
        style,
      ]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...props}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {icon}
      </View>
    </PressableScale>
  );
};
