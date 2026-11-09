import React from "react";
import {
  Pressable,
  PressableProps,
  View,
} from "react-native";

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
      className={`items-center justify-center ${getVariantStyles()} ${
        disabled ? "opacity-45" : ""
      } ${className || ""}`}
      style={({ pressed }) => [
        { width: size, height: size, minWidth: 44, minHeight: 44 },
        pressed && !disabled ? { opacity: 0.85, transform: [{ scale: 0.94 }] } : undefined,
        typeof style === "function" ? style({ pressed }) : (style as any),
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
    </Pressable>
  );
};
